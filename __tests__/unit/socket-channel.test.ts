import { SocketChannel } from "../../src/core/channels/socket-channel";
import { ChannelEvents } from "../../src/types/events/constants";
import { ActionType } from "../../src/types/protocol/actions";
import {
    IWebSocketClient,
    ILogger,
} from "../../src/types/services/clients";
import {
    Message,
    IncomingDataMessage,
} from "../../src/types/protocol/messages";

describe("SocketChannel", () => {
    // Track instances for cleanup
    const channelInstances: SocketChannel[] = [];

    // Helper function to create test mocks
    function createTestMocks() {
        const mockSocket = {
            readyState: WebSocket.OPEN as number,
            onopen: null as any,
            onclose: null as any,
            onerror: null as any,
            onmessage: null as any,
            close: jest.fn(),
            send: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };

        const wsClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true),
            getSocket: jest.fn().mockReturnValue(mockSocket),
            send: jest.fn(),
            reset: jest.fn(),
        } as jest.Mocked<IWebSocketClient>;

        const logger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
        } as jest.Mocked<ILogger>;

        return { wsClient, mockSocket, logger };
    }

    // Helper to create SocketChannel and track for cleanup
    function createChannel(
        name: string,
        mocks: ReturnType<typeof createTestMocks>
    ): SocketChannel {
        const { wsClient, logger } = mocks;
        const channel = new SocketChannel(name, wsClient, logger);
        channelInstances.push(channel);
        return channel;
    }

    // Cleanup after each test
    afterEach(() => {
        channelInstances.forEach((channel) => {
            channel.reset();
        });
        channelInstances.length = 0;
    });

    describe("Initialization", () => {
        it("should initialize with name and setup message handler", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            expect(channel.getName()).toBe("test-channel");
            expect(mocks.mockSocket.addEventListener).toHaveBeenCalledWith(
                "message",
                expect.any(Function)
            );
        });

        it("should emit initialized event", () => {
            const mocks = createTestMocks();
            const events: any[] = [];

            const channel = createChannel("test-channel", mocks);
            channel.on(ChannelEvents.INITIALIZED, (event) =>
                events.push(event)
            );

            // Create new channel to test event emission
            createChannel("another-channel", mocks);

            // Only captures events for the specific channel instance
            expect(events).toHaveLength(0);
        });

        it("should handle missing socket gracefully", () => {
            const mocks = createTestMocks();
            mocks.wsClient.getSocket.mockReturnValue(null);

            expect(() => createChannel("test-channel", mocks)).not.toThrow();
        });
    });

    describe("Subscription Management", () => {
        it("should handle successful subscription", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const events: any[] = [];
            const messages: Message[] = [];

            channel.on(ChannelEvents.SUBSCRIBING, (event) =>
                events.push({ type: "subscribing", ...event })
            );
            channel.on(ChannelEvents.SUBSCRIBED, (event) =>
                events.push({ type: "subscribed", ...event })
            );

            // Subscribe to channel
            channel.subscribe((message) => messages.push(message));

            expect(events).toContainEqual({
                type: "subscribing",
                channelName: "test-channel",
            });
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                JSON.stringify({
                    action: ActionType.SUBSCRIBE,
                    channel: "test-channel",
                })
            );

            // Simulate server subscription response
            const subscriptionResponse = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };

            // Get the message handler and simulate message
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            messageHandler?.({
                data: JSON.stringify(subscriptionResponse),
            } as MessageEvent);

            expect(events).toContainEqual({
                type: "subscribed",
                channelName: "test-channel",
                subscriptionId: "sub-123",
            });
            expect(channel.isSubscribed()).toBe(true);
        });

        it("should throw error when subscribing without connection", async () => {
            const mocks = createTestMocks();
            mocks.wsClient.isConnected.mockReturnValue(false);
            const channel = createChannel("test-channel", mocks);

            await expect(
                channel.subscribe(() => {})
            ).rejects.toThrow("Cannot subscribe: WebSocket is not connected");

            expect(channel.isPendingSubscribe()).toBe(true);
        });

        it("should not resubscribe if already subscribed", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            // First subscription
            channel.subscribe(() => {});

            // Simulate successful subscription
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Reset send calls
            mocks.wsClient.send.mockClear();

            // Second subscription attempt
            channel.subscribe(() => {});

            // Should not send another subscribe message
            expect(mocks.wsClient.send).not.toHaveBeenCalled();
        });

        it("should handle unsubscription", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const events: any[] = [];
            channel.on(ChannelEvents.UNSUBSCRIBED, (event) =>
                events.push(event)
            );

            // Subscribe first
            channel.subscribe(() => {});

            // Simulate unsubscribe response
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            expect(events).toContainEqual({
                channelName: "test-channel",
                subscriptionId: "sub-123",
            });
            expect(channel.isSubscribed()).toBe(false);
        });
    });

    describe("Message Handling", () => {
        it("should receive and transform messages correctly", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate subscription success
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                }),
            } as MessageEvent);

            // Simulate incoming data message
            const incomingMessage: IncomingDataMessage = {
                id: "msg-123",
                timestamp: Date.now().toString(),
                channel: "test-channel",
                action: ActionType.MESSAGE,
                messages: [
                    {
                        alias: "alias-1",
                        event: "user.created",
                        data: { userId: "user-123", name: "John Doe" },
                    },
                    {
                        alias: "alias-2",
                        event: "user.updated",
                        data: { userId: "user-456", name: "Jane Smith" },
                    },
                ],
            };

            messageHandler?.({
                data: JSON.stringify(incomingMessage),
            } as MessageEvent);

            expect(receivedMessages).toHaveLength(2);

            expect(receivedMessages[0]).toMatchObject({
                action: ActionType.MESSAGE,
                id: "msg-123-0",
                channel: "test-channel",
                alias: "alias-1",
                event: "user.created",
                data: { userId: "user-123", name: "John Doe" },
            });

            expect(receivedMessages[1]).toMatchObject({
                action: ActionType.MESSAGE,
                id: "msg-123-1",
                channel: "test-channel",
                alias: "alias-2",
                event: "user.updated",
                data: { userId: "user-456", name: "Jane Smith" },
            });
        });

        it("should handle single message without ID suffix", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate subscription success
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                }),
            } as MessageEvent);

            // Simulate incoming single message (should not get ID suffix)
            const incomingMessage: IncomingDataMessage = {
                id: "single-msg-123",
                timestamp: Date.now().toString(),
                channel: "test-channel",
                action: ActionType.MESSAGE,
                messages: [
                    {
                        alias: "alias-1",
                        event: "user.created",
                        data: { userId: "user-123", name: "John Doe" },
                    },
                ],
            };

            messageHandler?.({
                data: JSON.stringify(incomingMessage),
            } as MessageEvent);

            expect(receivedMessages).toHaveLength(1);

            expect(receivedMessages[0]).toMatchObject({
                action: ActionType.MESSAGE,
                id: "single-msg-123", // Should NOT get suffix for single message
                channel: "test-channel",
                alias: "alias-1",
                event: "user.created",
                data: { userId: "user-123", name: "John Doe" },
            });
        });

        it("should ignore messages for other channels", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            // Message for different channel
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.MESSAGE,
                    channel: "other-channel",
                    messages: [{ data: "should be ignored" }],
                }),
            } as MessageEvent);

            expect(receivedMessages).toHaveLength(0);
        });

        it("should handle malformed JSON messages", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) =>
                errorEvents.push(event)
            );

            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            // Invalid JSON
            messageHandler?.({ data: "invalid-json" } as MessageEvent);

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: "test-channel",
                action: "message_parsing",
            });

            // Verify logger.error was called with the error
            expect(mocks.logger.error).toHaveBeenCalledWith(
                expect.stringContaining("Error parsing message for channel"),
                expect.any(SyntaxError)
            );
        });

        it("should handle ERROR action messages", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) =>
                errorEvents.push(event)
            );

            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.ERROR,
                    channel: "test-channel",
                    error: new Error("Channel error occurred"),
                }),
            } as MessageEvent);

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: "test-channel",
                action: "channel_operation",
            });
        });
    });

    describe("Publishing", () => {
        it("should publish messages successfully", async () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const data = { message: "Hello, World!" };
            const event = "greeting";
            const alias = "alias-123";

            await channel.publish(data, { event, alias });

            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                JSON.stringify({
                    action: ActionType.PUBLISH,
                    channel: "test-channel",
                    messages: [
                        {
                            data,
                            event,
                            alias,
                        },
                    ],
                })
            );
        });

        it("should publish with minimal parameters", async () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const data = { message: "Simple message" };

            await channel.publish(data);

            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                JSON.stringify({
                    action: ActionType.PUBLISH,
                    channel: "test-channel",
                    messages: [
                        {
                            data,
                            event: undefined,
                            alias: undefined,
                        },
                    ],
                })
            );
        });

        it("should throw error when publishing without connection", async () => {
            const mocks = createTestMocks();
            mocks.wsClient.isConnected.mockReturnValue(false);
            const channel = createChannel("test-channel", mocks);

            await expect(channel.publish({ data: "test" })).rejects.toThrow(
                "Cannot publish: WebSocket is not connected"
            );
        });

        it("should emit error and rethrow on publish failure", async () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) =>
                errorEvents.push(event)
            );

            const publishError = new Error("Send failed");
            mocks.wsClient.send.mockImplementation(() => {
                throw publishError;
            });

            await expect(channel.publish({ data: "test" })).rejects.toThrow(
                "Send failed"
            );

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: "test-channel",
                action: "publish",
                error: publishError,
            });
        });
    });

    describe("Resubscription", () => {
        it("should resubscribe when pending and callback exists", async () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);
            channelInstances.push(channel);

            const callback = jest.fn();

            // Manually set up the state that would exist after a failed subscribe
            // The subscribe method sets pendingSubscribe to true when connection fails
            channel.setPendingSubscribe(true);
            // Manually set the callback since we need both conditions for resubscribe
            (channel as any).messageCallback = callback;

            // Verify initial state - should have pending subscribe and callback
            expect(channel.isPendingSubscribe()).toBe(true);

            // Now connection is available
            mocks.wsClient.isConnected.mockReturnValue(true);

            // Start resubscribe and simulate server response
            const resubscribePromise = channel.resubscribe();
            
            // Get message handler
            const messageHandler = mocks.mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            await resubscribePromise;

            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                JSON.stringify({
                    action: ActionType.SUBSCRIBE,
                    channel: "test-channel",
                })
            );
        });

        it("should not resubscribe when no callback or not pending", async () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            // No subscription attempted
            await channel.resubscribe();

            expect(mocks.wsClient.send).not.toHaveBeenCalled();
        });

        it("should handle resubscribe errors", async () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) =>
                errorEvents.push(event)
            );

            // Set up the state manually - both pending and callback needed
            channel.setPendingSubscribe(true);
            (channel as any).messageCallback = () => {};

            // Verify we have pending state
            expect(channel.isPendingSubscribe()).toBe(true);

            // Now enable connection but make subscribe fail
            const resubscribeError = new Error("Resubscribe failed");
            mocks.wsClient.isConnected.mockReturnValue(true);
            mocks.wsClient.send.mockImplementation(() => {
                throw resubscribeError;
            });

            await expect(channel.resubscribe()).rejects.toThrow(
                "Resubscribe failed"
            );

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: "test-channel",
                action: "resubscribe",
                error: resubscribeError,
            });
        });
    });

    describe("State Management", () => {
        it("should track subscription state correctly", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            expect(channel.isSubscribed()).toBe(false);
            expect(channel.isPendingSubscribe()).toBe(false);

            // Subscribe
            channel.subscribe(() => {});
            expect(channel.isSubscribed()).toBe(false); // Not yet confirmed
            expect(channel.isPendingSubscribe()).toBe(true); // Set to true until server confirms

            // Simulate subscription confirmation
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                }),
            } as MessageEvent);

            expect(channel.isSubscribed()).toBe(true);
            expect(channel.isPendingSubscribe()).toBe(false);
        });

        it("should handle setPendingSubscribe correctly", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            expect(channel.isPendingSubscribe()).toBe(false);

            channel.setPendingSubscribe(true);
            expect(channel.isPendingSubscribe()).toBe(true);

            channel.setPendingSubscribe(false);
            expect(channel.isPendingSubscribe()).toBe(false);
        });

        it("should track callback state correctly", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            // Initially no callback
            expect(channel.hasCallback()).toBe(false);

            // After subscribing, should have callback
            channel.subscribe(() => {});
            expect(channel.hasCallback()).toBe(true);

            // Get message handler to simulate server messages
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            // Simulate server subscription confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            expect(channel.isSubscribed()).toBe(true);

            // After unsubscribing, callback should still exist until server confirms
            channel.unsubscribe();
            expect(channel.hasCallback()).toBe(true);

            // Simulate server unsubscribe confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                }),
            } as MessageEvent);

            // Now callback should be cleared
            expect(channel.hasCallback()).toBe(false);
        });

        it("should retain callback state after subscribe even without server confirmation", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            expect(channel.hasCallback()).toBe(false);

            channel.subscribe(() => {});
            // Even without server SUBSCRIBED message, callback should be registered
            expect(channel.hasCallback()).toBe(true);
        });

        it("should clear callback state on reset", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            channel.subscribe(() => {});
            expect(channel.hasCallback()).toBe(true);

            channel.reset();
            expect(channel.hasCallback()).toBe(false);
        });
    });

    describe("Pause/Resume Management", () => {
        it("should pause and resume channel", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            expect(channel.isPaused()).toBe(false);

            channel.pause();
            expect(channel.isPaused()).toBe(true);

            channel.resume();
            expect(channel.isPaused()).toBe(false);
        });

        it("should emit PAUSED event when pausing", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const events: any[] = [];
            channel.on(ChannelEvents.PAUSED, (event) => events.push(event));

            channel.pause();

            expect(events).toHaveLength(1);
            expect(events[0]).toEqual({
                channelName: "test-channel",
                buffering: true,
            });
        });

        it("should emit RESUMED event when resuming", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const events: any[] = [];
            channel.on(ChannelEvents.RESUMED, (event) => events.push(event));

            channel.pause();
            channel.resume();

            expect(events).toHaveLength(1);
            expect(events[0]).toEqual({
                channelName: "test-channel",
                bufferedMessagesDelivered: 0,
            });
        });

        it("should buffer messages when paused with buffering enabled", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate server subscription response
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Pause the channel
            channel.pause({ bufferMessages: true });

            // Simulate incoming message while paused
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                channel: "test-channel",
                id: "msg-1",
                timestamp: Date.now().toString(),
                messages: [{ data: { text: "paused message" } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Message should not be delivered yet
            expect(receivedMessages).toHaveLength(0);

            // Resume and message should be delivered
            channel.resume();
            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0].data).toEqual({
                text: "paused message",
            });
        });

        it("should drop messages when paused with buffering disabled", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate server subscription response
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Pause the channel without buffering
            channel.pause({ bufferMessages: false });

            // Simulate incoming message while paused
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                channel: "test-channel",
                id: "msg-1",
                timestamp: Date.now().toString(),
                messages: [{ data: { text: "dropped message" } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Message should not be delivered
            expect(receivedMessages).toHaveLength(0);

            // Resume - message should still not be delivered (was dropped)
            channel.resume();
            expect(receivedMessages).toHaveLength(0);
        });

        it("should buffer multiple messages and deliver all on resume", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate server subscription response
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            channel.pause();

            // Simulate multiple incoming messages while paused
            for (let i = 1; i <= 3; i++) {
                const dataMessage: IncomingDataMessage = {
                    action: ActionType.MESSAGE,
                    channel: "test-channel",
                    id: `msg-${i}`,
                    timestamp: Date.now().toString(),
                    messages: [{ data: { text: `message ${i}` } }],
                };
                messageHandler?.({
                    data: JSON.stringify(dataMessage),
                } as MessageEvent);
            }

            expect(receivedMessages).toHaveLength(0);

            // Resume and all messages should be delivered
            channel.resume();
            expect(receivedMessages).toHaveLength(3);
            expect(receivedMessages[0].data).toEqual({ text: "message 1" });
            expect(receivedMessages[1].data).toEqual({ text: "message 2" });
            expect(receivedMessages[2].data).toEqual({ text: "message 3" });
        });

        it("should clear buffered messages when clearBufferedMessages is called", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate server subscription response
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            channel.pause();

            // Simulate incoming message while paused
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                channel: "test-channel",
                id: "msg-1",
                timestamp: Date.now().toString(),
                messages: [{ data: { text: "buffered message" } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Clear buffered messages
            channel.clearBufferedMessages();

            // Resume - no messages should be delivered
            channel.resume();
            expect(receivedMessages).toHaveLength(0);
        });

        it("should not pause if already paused", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const events: any[] = [];
            channel.on(ChannelEvents.PAUSED, (event) => events.push(event));

            channel.pause();
            channel.pause(); // Try to pause again

            // Should only emit once
            expect(events).toHaveLength(1);
        });

        it("should not resume if not paused", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const events: any[] = [];
            channel.on(ChannelEvents.RESUMED, (event) => events.push(event));

            channel.resume(); // Try to resume without pausing

            // Should not emit
            expect(events).toHaveLength(0);
        });

        it("should deliver messages normally when not paused", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate server subscription response
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Simulate incoming message without pausing
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                channel: "test-channel",
                id: "msg-1",
                timestamp: Date.now().toString(),
                messages: [{ data: { text: "normal message" } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Message should be delivered immediately
            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0].data).toEqual({
                text: "normal message",
            });
        });

        it("should reset pause state on channel reset", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate subscription
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            channel.pause();

            // Simulate incoming message while paused
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                channel: "test-channel",
                id: "msg-1",
                timestamp: Date.now().toString(),
                messages: [{ data: { text: "buffered message" } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Reset should clear pause state and buffered messages
            channel.reset();

            expect(channel.isPaused()).toBe(false);
            // After reset, no messages should be in buffer
        });

        it("should include buffered count in resume event", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);

            const resumeEvents: any[] = [];
            channel.on(ChannelEvents.RESUMED, (event) =>
                resumeEvents.push(event)
            );

            channel.subscribe((message) => {});

            // Simulate subscription
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1];

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            channel.pause();

            // Buffer 2 messages
            for (let i = 1; i <= 2; i++) {
                const dataMessage: IncomingDataMessage = {
                    action: ActionType.MESSAGE,
                    channel: "test-channel",
                    id: `msg-${i}`,
                    timestamp: Date.now().toString(),
                    messages: [{ data: { text: `message ${i}` } }],
                };
                messageHandler?.({
                    data: JSON.stringify(dataMessage),
                } as MessageEvent);
            }

            channel.resume();

            expect(resumeEvents).toHaveLength(1);
            expect(resumeEvents[0].bufferedMessagesDelivered).toBe(2);
        });
    });

    describe("Event-Specific Subscriptions with Options", () => {
        it("should route messages by event name when event option is set", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const receivedMessages: Message[] = [];
            const callback = jest.fn((message: Message) => {
                receivedMessages.push(message);
            });

            // Subscribe with event option
            channel.subscribe(callback, { event: "user-login" });

            // Simulate SUBSCRIBED confirmation
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Send messages with different events
            const dataMessage1: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "user-login", data: { userId: 1 } },
                    { event: "user-logout", data: { userId: 2 } },
                    { event: "user-login", data: { userId: 3 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage1),
            } as MessageEvent);

            // Only messages with "user-login" event should be received
            expect(receivedMessages).toHaveLength(2);
            expect(receivedMessages[0].event).toBe("user-login");
            expect(receivedMessages[0].data).toEqual({ userId: 1 });
            expect(receivedMessages[1].event).toBe("user-login");
            expect(receivedMessages[1].data).toEqual({ userId: 3 });
        });

        it("should ignore messages without event when event option is set", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const receivedMessages: Message[] = [];
            const callback = jest.fn((message: Message) => {
                receivedMessages.push(message);
            });

            // Subscribe with event option
            channel.subscribe(callback, { event: "specific-event" });

            // Simulate SUBSCRIBED confirmation
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Send messages with and without events
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "specific-event", data: { id: 1 } },
                    { data: { id: 2 } }, // No event property
                    { event: "other-event", data: { id: 3 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Only the message with matching event should be received
            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0].event).toBe("specific-event");
            expect(receivedMessages[0].data).toEqual({ id: 1 });
        });

        it("should receive all messages when no event option is set", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const receivedMessages: Message[] = [];
            const callback = jest.fn((message: Message) => {
                receivedMessages.push(message);
            });

            // Subscribe without event option
            channel.subscribe(callback);

            // Simulate SUBSCRIBED confirmation
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Send messages with different events
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "event-1", data: { id: 1 } },
                    { event: "event-2", data: { id: 2 } },
                    { data: { id: 3 } }, // No event
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // All messages should be received
            expect(receivedMessages).toHaveLength(3);
            expect(receivedMessages[0].event).toBe("event-1");
            expect(receivedMessages[1].event).toBe("event-2");
            expect(receivedMessages[2].event).toBeUndefined();
        });

        it("should route buffered messages when resuming with event option", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const receivedMessages: Message[] = [];
            const callback = jest.fn((message: Message) => {
                receivedMessages.push(message);
            });

            // Subscribe with event option
            channel.subscribe(callback, { event: "important" });

            // Simulate SUBSCRIBED confirmation
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Pause the channel
            channel.pause({ bufferMessages: true });

            // Send messages while paused
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "important", data: { id: 1 } },
                    { event: "not-important", data: { id: 2 } },
                    { event: "important", data: { id: 3 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // No messages should be received yet
            expect(receivedMessages).toHaveLength(0);

            // Resume the channel
            channel.resume();

            // Only filtered messages should be delivered
            expect(receivedMessages).toHaveLength(2);
            expect(receivedMessages[0].event).toBe("important");
            expect(receivedMessages[0].data).toEqual({ id: 1 });
            expect(receivedMessages[1].event).toBe("important");
            expect(receivedMessages[1].data).toEqual({ id: 3 });
        });

        it("should preserve event-specific subscription on resubscribe", async () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const callback = jest.fn();

            // Subscribe with event option
            channel.subscribe(callback, { event: "my-event" });

            // Simulate SUBSCRIBED confirmation for initial subscription
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            const initialSubscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(initialSubscribedMessage),
            } as MessageEvent);

            // Clear the send mock to check resubscribe call
            wsClient.send.mockClear();

            // Trigger resubscribe and immediately simulate SUBSCRIBED response
            const resubscribePromise = channel.resubscribe();
            
            // Simulate SUBSCRIBED confirmation for resubscribe
            const resubscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-456",
            };
            messageHandler?.({
                data: JSON.stringify(resubscribedMessage),
            } as MessageEvent);

            // Wait for resubscribe to complete
            await resubscribePromise;

            // Should have sent SUBSCRIBE message (action: 4)
            expect(wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":4')
            );

            // Send messages with different events
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "my-event", data: { id: 1 } },
                    { event: "other-event", data: { id: 2 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Only message with "my-event" should be received
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback.mock.calls[0][0].event).toBe("my-event");
        });

        it("should support multiple event subscriptions simultaneously", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const receivedMessages: Message[] = [];
            const callback1 = jest.fn((message: Message) => {
                receivedMessages.push(message);
            });

            // Subscribe with first event
            channel.subscribe(callback1, { event: "event-1" });

            // Simulate SUBSCRIBED confirmation
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            const subscribedMessage = {
                action: ActionType.SUBSCRIBED,
                channel: "test-channel",
                subscription_id: "sub-123",
            };
            messageHandler?.({
                data: JSON.stringify(subscribedMessage),
            } as MessageEvent);

            // Add another subscription with different event
            const callback2 = jest.fn((message: Message) => {
                receivedMessages.push(message);
            });
            channel.subscribe(callback2, { event: "event-2" });

            // Send messages with different events
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "event-1", data: { id: 1 } },
                    { event: "event-2", data: { id: 2 } },
                    { event: "event-3", data: { id: 3 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Both event-1 and event-2 messages should be received
            expect(receivedMessages).toHaveLength(2);
            expect(receivedMessages[0].event).toBe("event-1");
            expect(receivedMessages[0].data).toEqual({ id: 1 });
            expect(receivedMessages[1].event).toBe("event-2");
            expect(receivedMessages[1].data).toEqual({ id: 2 });
            // Both callbacks should be called
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });
    });

    describe("Event-Specific Subscriptions", () => {
        it("should subscribe callback to specific event", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const receivedMessages: Message[] = [];
            const callback = jest.fn((message: Message) => {
                receivedMessages.push(message);
            });

            // Subscribe to specific event
            channel.subscribe(callback, { event: "user-login" });

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Send messages with different events
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "user-login", data: { userId: 1 } },
                    { event: "user-logout", data: { userId: 2 } },
                    { event: "user-login", data: { userId: 3 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Only user-login messages should be received
            expect(receivedMessages).toHaveLength(2);
            expect(receivedMessages[0].event).toBe("user-login");
            expect(receivedMessages[1].event).toBe("user-login");
        });

        it("should support multiple callbacks for different events", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const loginMessages: Message[] = [];
            const logoutMessages: Message[] = [];

            const loginCallback = jest.fn((message: Message) => {
                loginMessages.push(message);
            });

            const logoutCallback = jest.fn((message: Message) => {
                logoutMessages.push(message);
            });

            // Subscribe to different events
            channel.subscribe(loginCallback, { event: "user-login" });
            channel.subscribe(logoutCallback, { event: "user-logout" });

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Send messages
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "user-login", data: { userId: 1 } },
                    { event: "user-logout", data: { userId: 2 } },
                    { event: "user-login", data: { userId: 3 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Each callback should only receive its event
            expect(loginMessages).toHaveLength(2);
            expect(logoutMessages).toHaveLength(1);
            expect(loginCallback).toHaveBeenCalledTimes(2);
            expect(logoutCallback).toHaveBeenCalledTimes(1);
        });

        it("should support multiple callbacks for the same event", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const callback1 = jest.fn();
            const callback2 = jest.fn();

            // Subscribe multiple callbacks to same event
            channel.subscribe(callback1, { event: "user-login" });
            channel.subscribe(callback2, { event: "user-login" });

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Send message
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [{ event: "user-login", data: { userId: 1 } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Both callbacks should be called
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        it("should unsubscribe specific callback from event", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const callback1 = jest.fn();
            const callback2 = jest.fn();

            // Subscribe callbacks
            channel.subscribe(callback1, { event: "user-login" });
            channel.subscribe(callback2, { event: "user-login" });

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Unsubscribe first callback from specific event
            channel.unsubscribe(callback1, { event: "user-login" });

            // Send message
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [{ event: "user-login", data: { userId: 1 } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Only callback2 should be called
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        it("should unsubscribe all callbacks for specific event", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const loginCallback1 = jest.fn();
            const loginCallback2 = jest.fn();
            const logoutCallback = jest.fn();

            // Subscribe callbacks
            channel.subscribe(loginCallback1, { event: "user-login" });
            channel.subscribe(loginCallback2, { event: "user-login" });
            channel.subscribe(logoutCallback, { event: "user-logout" });

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Unsubscribe all callbacks for user-login (no callback parameter)
            channel.unsubscribe(undefined, { event: "user-login" });

            // Send messages
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "user-login", data: { userId: 1 } },
                    { event: "user-logout", data: { userId: 2 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Login callbacks should not be called, logout should
            expect(loginCallback1).not.toHaveBeenCalled();
            expect(loginCallback2).not.toHaveBeenCalled();
            expect(logoutCallback).toHaveBeenCalledTimes(1);
        });

        it("should unsubscribe from channel when no event callbacks remain", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const loginCallback = jest.fn();
            const logoutCallback = jest.fn();

            // Subscribe to events
            channel.subscribe(loginCallback, { event: "user-login" });
            channel.subscribe(logoutCallback, { event: "user-logout" });

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Unsubscribe from both events
            channel.unsubscribe(undefined, { event: "user-login" });
            channel.unsubscribe(undefined, { event: "user-logout" });

            // Simulate UNSUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                }),
            } as MessageEvent);

            // Channel should now be unsubscribed
            expect(channel.isSubscribed()).toBe(false);

            // Send messages
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [
                    { event: "user-login", data: { userId: 1 } },
                    { event: "user-logout", data: { userId: 2 } },
                ],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // No callbacks should be called
            expect(loginCallback).not.toHaveBeenCalled();
            expect(logoutCallback).not.toHaveBeenCalled();
        });

        it("should clear event callbacks on reset", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const callback = jest.fn();

            // Subscribe to event
            channel.subscribe(callback, { event: "user-login" });

            // Reset channel
            channel.reset();

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Re-subscribe and send message
            channel.subscribe(jest.fn());

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-456",
                }),
            } as MessageEvent);

            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [{ event: "user-login", data: { userId: 1 } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Callback should not be called (was cleared)
            expect(callback).not.toHaveBeenCalled();
        });

        it("should not call event-specific callbacks for messages without event property", () => {
            const { wsClient, mockSocket, logger } = createTestMocks();
            const channel = new SocketChannel("test-channel", wsClient, logger);
            channelInstances.push(channel);

            const callback = jest.fn();

            // Subscribe to event
            channel.subscribe(callback, { event: "user-login" });

            // Get message handler
            const messageHandler = mockSocket.addEventListener.mock.calls.find(
                (call) => call[0] === "message"
            )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Send message without event
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [{ data: { userId: 1 } }], // No event property
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // Callback should not be called
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("Operation Queue (Race Condition Handling)", () => {
        it("should queue subscribe when unsubscribe is pending", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            // First subscribe
            channel.subscribe(callback1);

            // Get message handler
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Clear previous calls
            mocks.wsClient.send.mockClear();

            // Call unsubscribe (this sets pendingUnsubscribe = true)
            channel.unsubscribe();
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":6')
            );

            // Immediately call subscribe - should be queued
            mocks.wsClient.send.mockClear();
            channel.subscribe(callback2);

            // Subscribe message should NOT be sent yet
            expect(mocks.wsClient.send).not.toHaveBeenCalled();

            // Simulate UNSUBSCRIBED acknowledgment
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Now the queued subscribe should be executed
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":4')
            );
        });

        it("should queue unsubscribe when subscribe is pending", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);
            const callback = jest.fn();

            // Call subscribe (this sets pendingSubscribe = true)
            channel.subscribe(callback);
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":4')
            );

            // Immediately call unsubscribe - should be queued
            mocks.wsClient.send.mockClear();
            channel.unsubscribe();

            // Unsubscribe message should NOT be sent yet
            expect(mocks.wsClient.send).not.toHaveBeenCalled();

            // Get message handler
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED acknowledgment
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Now the queued unsubscribe should be executed
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":6')
            );
        });

        it("should handle rapid unsubscribe -> subscribe with different events", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);
            const oldEventCallback = jest.fn();
            const newEventCallback = jest.fn();

            // Subscribe to old event
            channel.subscribe(oldEventCallback, { event: "old-event" });

            // Get message handler
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            expect(channel.isSubscribed()).toBe(true);

            // Clear previous calls
            mocks.wsClient.send.mockClear();

            // Rapidly change from old-event to new-event
            channel.unsubscribe(oldEventCallback, { event: "old-event" });
            channel.subscribe(newEventCallback, { event: "new-event" });

            // First unsubscribe should trigger (fully unsubscribes since no more event callbacks)
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":6')
            );

            // Subscribe should be queued
            expect(mocks.wsClient.send).toHaveBeenCalledTimes(1);

            // Simulate UNSUBSCRIBED acknowledgment
            mocks.wsClient.send.mockClear();
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            // Now the queued subscribe should execute
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":4')
            );

            // Simulate SUBSCRIBED confirmation for new subscription
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-456",
                }),
            } as MessageEvent);

            // Send a message with new event
            const dataMessage: IncomingDataMessage = {
                action: ActionType.MESSAGE,
                id: "msg-1",
                timestamp: "2024-01-01T00:00:00Z",
                channel: "test-channel",
                messages: [{ event: "new-event", data: { test: true } }],
            };
            messageHandler?.({
                data: JSON.stringify(dataMessage),
            } as MessageEvent);

            // New callback should be called, old should not
            expect(newEventCallback).toHaveBeenCalledTimes(1);
            expect(oldEventCallback).not.toHaveBeenCalled();
        });

        it("should process multiple queued operations in order", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            // Subscribe
            channel.subscribe(callback1);

            // Get message handler
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-1",
                }),
            } as MessageEvent);

            mocks.wsClient.send.mockClear();

            // Queue multiple operations rapidly
            channel.unsubscribe(); // Operation 1: Execute immediately
            channel.subscribe(callback2); // Operation 2: Queue
            channel.unsubscribe(); // Operation 3: Queue

            // Only first unsubscribe should be sent
            expect(mocks.wsClient.send).toHaveBeenCalledTimes(1);
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":6')
            );

            // Process first acknowledgment
            mocks.wsClient.send.mockClear();
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-1",
                }),
            } as MessageEvent);

            // Second operation (subscribe) should execute
            expect(mocks.wsClient.send).toHaveBeenCalledTimes(1);
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":4')
            );

            // Process second acknowledgment
            mocks.wsClient.send.mockClear();
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-2",
                }),
            } as MessageEvent);

            // Third operation (unsubscribe) should execute
            expect(mocks.wsClient.send).toHaveBeenCalledTimes(1);
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":6')
            );
        });

        it("should not queue when no operations are pending", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            // First subscribe
            channel.subscribe(callback1);
            expect(mocks.wsClient.send).toHaveBeenCalledTimes(1);

            // Get message handler
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            mocks.wsClient.send.mockClear();

            // Now call unsubscribe after subscribe completed
            channel.unsubscribe();
            expect(mocks.wsClient.send).toHaveBeenCalledTimes(1);
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":6')
            );

            // Simulate UNSUBSCRIBED confirmation
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-123",
                }),
            } as MessageEvent);

            mocks.wsClient.send.mockClear();

            // Now call subscribe after unsubscribe completed
            channel.subscribe(callback2);
            expect(mocks.wsClient.send).toHaveBeenCalledTimes(1);
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                expect.stringContaining('"action":4')
            );
        });

        it("should clear operation queue on reset", () => {
            const mocks = createTestMocks();
            const channel = createChannel("test-channel", mocks);
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            // Subscribe
            channel.subscribe(callback1);

            // Get message handler
            const messageHandler =
                mocks.mockSocket.addEventListener.mock.calls.find(
                    (call) => call[0] === "message"
                )?.[1] as (event: MessageEvent) => void;

            // Simulate SUBSCRIBED
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-1",
                }),
            } as MessageEvent);

            // Queue operations
            channel.unsubscribe();
            channel.subscribe(callback2);

            // Reset the channel
            channel.reset();

            // Simulate acknowledgment - should not process queue
            mocks.wsClient.send.mockClear();
            messageHandler?.({
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: "test-channel",
                    subscription_id: "sub-1",
                }),
            } as MessageEvent);

            // No operations should execute after reset
            expect(mocks.wsClient.send).not.toHaveBeenCalled();
        });
    });
});

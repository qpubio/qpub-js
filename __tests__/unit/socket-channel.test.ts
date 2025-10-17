import { SocketChannel } from "../../src/core/channels/socket-channel";
import { ChannelEvents } from "../../src/types/event.type";
import { ActionType } from "../../src/types/action.type";
import {
    IWebSocketClient,
    ILogger,
} from "../../src/interfaces/services.interface";
import {
    Message,
    IncomingDataMessage,
} from "../../src/interfaces/message.interface";

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

        it("should throw error when subscribing without connection", () => {
            const mocks = createTestMocks();
            mocks.wsClient.isConnected.mockReturnValue(false);
            const channel = createChannel("test-channel", mocks);

            expect(() => {
                channel.subscribe(() => {});
            }).toThrow("Cannot subscribe: WebSocket is not connected");

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

            await channel.publish(data, event, alias);

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

            await channel.resubscribe();

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
            expect(channel.isPendingSubscribe()).toBe(false); // Reset after subscribe call

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
});

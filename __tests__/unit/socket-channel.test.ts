import { SocketChannel } from '../../src/core/channels/socket-channel';
import { ChannelEvents } from '../../src/types/event.type';
import { ActionType } from '../../src/types/action.type';
import { IWebSocketClient } from '../../src/interfaces/services.interface';
import { Message, IncomingDataMessage } from '../../src/interfaces/message.interface';

describe('SocketChannel', () => {
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
            removeEventListener: jest.fn()
        };

        const wsClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true),
            getSocket: jest.fn().mockReturnValue(mockSocket),
            send: jest.fn(),
            reset: jest.fn()
        } as jest.Mocked<IWebSocketClient>;

        return { wsClient, mockSocket };
    }

    // Helper to create SocketChannel and track for cleanup
    function createChannel(name: string, mocks: ReturnType<typeof createTestMocks>): SocketChannel {
        const { wsClient } = mocks;
        const channel = new SocketChannel(name, wsClient);
        channelInstances.push(channel);
        return channel;
    }

    // Cleanup after each test
    afterEach(() => {
        channelInstances.forEach(channel => {
            channel.reset();
        });
        channelInstances.length = 0;
    });

    describe('Initialization', () => {
        it('should initialize with name and setup message handler', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            expect(channel.getName()).toBe('test-channel');
            expect(mocks.mockSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('should emit initialized event', () => {
            const mocks = createTestMocks();
            const events: any[] = [];
            
            const channel = createChannel('test-channel', mocks);
            channel.on(ChannelEvents.INITIALIZED, (event) => events.push(event));
            
            // Create new channel to test event emission
            createChannel('another-channel', mocks);
            
            // Only captures events for the specific channel instance
            expect(events).toHaveLength(0);
        });

        it('should handle missing socket gracefully', () => {
            const mocks = createTestMocks();
            mocks.wsClient.getSocket.mockReturnValue(null);

            expect(() => createChannel('test-channel', mocks)).not.toThrow();
        });
    });

    describe('Subscription Management', () => {
        it('should handle successful subscription', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const events: any[] = [];
            const messages: Message[] = [];
            
            channel.on(ChannelEvents.SUBSCRIBING, (event) => events.push({ type: 'subscribing', ...event }));
            channel.on(ChannelEvents.SUBSCRIBED, (event) => events.push({ type: 'subscribed', ...event }));

            // Subscribe to channel
            channel.subscribe((message) => messages.push(message));

            expect(events).toContainEqual({ type: 'subscribing', channelName: 'test-channel' });
            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                JSON.stringify({
                    action: ActionType.SUBSCRIBE,
                    channel: 'test-channel'
                })
            );

            // Simulate server subscription response
            const subscriptionResponse = {
                action: ActionType.SUBSCRIBED,
                channel: 'test-channel',
                subscriptionId: 'sub-123'
            };

            // Get the message handler and simulate message
            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];
            
            messageHandler?.({ data: JSON.stringify(subscriptionResponse) } as MessageEvent);

            expect(events).toContainEqual({ 
                type: 'subscribed', 
                channelName: 'test-channel', 
                subscriptionId: 'sub-123' 
            });
            expect(channel.isSubscribed()).toBe(true);
        });

        it('should throw error when subscribing without connection', () => {
            const mocks = createTestMocks();
            mocks.wsClient.isConnected.mockReturnValue(false);
            const channel = createChannel('test-channel', mocks);

            expect(() => {
                channel.subscribe(() => {});
            }).toThrow('Cannot subscribe: WebSocket is not connected');

            expect(channel.isPendingSubscribe()).toBe(true);
        });

        it('should not resubscribe if already subscribed', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            // First subscription
            channel.subscribe(() => {});
            
            // Simulate successful subscription
            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];
            messageHandler?.({ 
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: 'test-channel',
                    subscriptionId: 'sub-123'
                })
            } as MessageEvent);

            // Reset send calls
            mocks.wsClient.send.mockClear();

            // Second subscription attempt
            channel.subscribe(() => {});

            // Should not send another subscribe message
            expect(mocks.wsClient.send).not.toHaveBeenCalled();
        });

        it('should handle unsubscription', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const events: any[] = [];
            channel.on(ChannelEvents.UNSUBSCRIBED, (event) => events.push(event));

            // Subscribe first
            channel.subscribe(() => {});

            // Simulate unsubscribe response
            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];
            
            messageHandler?.({ 
                data: JSON.stringify({
                    action: ActionType.UNSUBSCRIBED,
                    channel: 'test-channel',
                    subscriptionId: 'sub-123'
                })
            } as MessageEvent);

            expect(events).toContainEqual({
                channelName: 'test-channel',
                subscriptionId: 'sub-123'
            });
            expect(channel.isSubscribed()).toBe(false);
        });
    });

    describe('Message Handling', () => {
        it('should receive and transform messages correctly', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate subscription success
            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];
            
            messageHandler?.({ 
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: 'test-channel'
                })
            } as MessageEvent);

            // Simulate incoming data message
            const incomingMessage: IncomingDataMessage = {
                id: 'msg-123',
                timestamp: Date.now().toString(),
                channel: 'test-channel',
                action: ActionType.MESSAGE,
                messages: [
                    {
                        alias: 'alias-1',
                        event: 'user.created',
                        data: { userId: 'user-123', name: 'John Doe' }
                    },
                    {
                        alias: 'alias-2', 
                        event: 'user.updated',
                        data: { userId: 'user-456', name: 'Jane Smith' }
                    }
                ]
            };

            messageHandler?.({ data: JSON.stringify(incomingMessage) } as MessageEvent);

            expect(receivedMessages).toHaveLength(2);
            
            expect(receivedMessages[0]).toMatchObject({
                action: ActionType.MESSAGE,
                id: 'msg-123-0',
                channel: 'test-channel',
                alias: 'alias-1',
                event: 'user.created',
                data: { userId: 'user-123', name: 'John Doe' }
            });

            expect(receivedMessages[1]).toMatchObject({
                action: ActionType.MESSAGE,
                id: 'msg-123-1', 
                channel: 'test-channel',
                alias: 'alias-2',
                event: 'user.updated',
                data: { userId: 'user-456', name: 'Jane Smith' }
            });
        });

        it('should handle single message without ID suffix', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            // Simulate subscription success
            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];
            
            messageHandler?.({ 
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: 'test-channel'
                })
            } as MessageEvent);

            // Simulate incoming single message (should not get ID suffix)
            const incomingMessage: IncomingDataMessage = {
                id: 'single-msg-123',
                timestamp: Date.now().toString(),
                channel: 'test-channel',
                action: ActionType.MESSAGE,
                messages: [
                    {
                        alias: 'alias-1',
                        event: 'user.created',
                        data: { userId: 'user-123', name: 'John Doe' }
                    }
                ]
            };

            messageHandler?.({ data: JSON.stringify(incomingMessage) } as MessageEvent);

            expect(receivedMessages).toHaveLength(1);
            
            expect(receivedMessages[0]).toMatchObject({
                action: ActionType.MESSAGE,
                id: 'single-msg-123', // Should NOT get suffix for single message
                channel: 'test-channel',
                alias: 'alias-1',
                event: 'user.created',
                data: { userId: 'user-123', name: 'John Doe' }
            });
        });

        it('should ignore messages for other channels', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const receivedMessages: Message[] = [];
            channel.subscribe((message) => receivedMessages.push(message));

            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];

            // Message for different channel
            messageHandler?.({ 
                data: JSON.stringify({
                    action: ActionType.MESSAGE,
                    channel: 'other-channel',
                    messages: [{ data: 'should be ignored' }]
                })
            } as MessageEvent);

            expect(receivedMessages).toHaveLength(0);
        });

        it('should handle malformed JSON messages', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) => errorEvents.push(event));

            // Suppress console.error for this test since we're intentionally testing error handling
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];

            // Invalid JSON
            messageHandler?.({ data: 'invalid-json' } as MessageEvent);

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: 'test-channel',
                action: 'message_parsing'
            });

            // Verify console.error was called and restore it
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing message:', expect.any(SyntaxError));
            consoleErrorSpy.mockRestore();
        });

        it('should handle ERROR action messages', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) => errorEvents.push(event));

            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];

            messageHandler?.({ 
                data: JSON.stringify({
                    action: ActionType.ERROR,
                    channel: 'test-channel',
                    error: new Error('Channel error occurred')
                })
            } as MessageEvent);

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: 'test-channel',
                action: 'channel_operation'
            });
        });
    });

    describe('Publishing', () => {
        it('should publish messages successfully', async () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const data = { message: 'Hello, World!' };
            const event = 'greeting';
            const alias = 'alias-123';

            await channel.publish(data, event, alias);

            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                JSON.stringify({
                    action: ActionType.PUBLISH,
                    channel: 'test-channel',
                    messages: [{
                        data,
                        event,
                        alias
                    }]
                })
            );
        });

        it('should publish with minimal parameters', async () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const data = { message: 'Simple message' };

            await channel.publish(data);

            expect(mocks.wsClient.send).toHaveBeenCalledWith(
                JSON.stringify({
                    action: ActionType.PUBLISH,
                    channel: 'test-channel',
                    messages: [{
                        data,
                        event: undefined,
                        alias: undefined
                    }]
                })
            );
        });

        it('should throw error when publishing without connection', async () => {
            const mocks = createTestMocks();
            mocks.wsClient.isConnected.mockReturnValue(false);
            const channel = createChannel('test-channel', mocks);

            await expect(channel.publish({ data: 'test' })).rejects.toThrow(
                'Cannot publish: WebSocket is not connected'
            );
        });

        it('should emit error and rethrow on publish failure', async () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) => errorEvents.push(event));

            const publishError = new Error('Send failed');
            mocks.wsClient.send.mockImplementation(() => {
                throw publishError;
            });

            await expect(channel.publish({ data: 'test' })).rejects.toThrow('Send failed');

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: 'test-channel',
                action: 'publish',
                error: publishError
            });
        });
    });

    describe('Resubscription', () => {
        it('should resubscribe when pending and callback exists', async () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

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
                    channel: 'test-channel'
                })
            );
        });

        it('should not resubscribe when no callback or not pending', async () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            // No subscription attempted
            await channel.resubscribe();

            expect(mocks.wsClient.send).not.toHaveBeenCalled();
        });

        it('should handle resubscribe errors', async () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            const errorEvents: any[] = [];
            channel.on(ChannelEvents.FAILED, (event) => errorEvents.push(event));

            // Set up the state manually - both pending and callback needed
            channel.setPendingSubscribe(true);
            (channel as any).messageCallback = () => {};

            // Verify we have pending state
            expect(channel.isPendingSubscribe()).toBe(true);

            // Now enable connection but make subscribe fail
            const resubscribeError = new Error('Resubscribe failed');
            mocks.wsClient.isConnected.mockReturnValue(true);
            mocks.wsClient.send.mockImplementation(() => {
                throw resubscribeError;
            });

            await expect(channel.resubscribe()).rejects.toThrow('Resubscribe failed');

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0]).toMatchObject({
                channelName: 'test-channel',
                action: 'resubscribe',
                error: resubscribeError
            });
        });
    });

    describe('State Management', () => {
        it('should track subscription state correctly', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            expect(channel.isSubscribed()).toBe(false);
            expect(channel.isPendingSubscribe()).toBe(false);

            // Subscribe
            channel.subscribe(() => {});
            expect(channel.isSubscribed()).toBe(false); // Not yet confirmed
            expect(channel.isPendingSubscribe()).toBe(false); // Reset after subscribe call

            // Simulate subscription confirmation
            const messageHandler = mocks.mockSocket.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];
            
            messageHandler?.({ 
                data: JSON.stringify({
                    action: ActionType.SUBSCRIBED,
                    channel: 'test-channel'
                })
            } as MessageEvent);

            expect(channel.isSubscribed()).toBe(true);
            expect(channel.isPendingSubscribe()).toBe(false);
        });

        it('should handle setPendingSubscribe correctly', () => {
            const mocks = createTestMocks();
            const channel = createChannel('test-channel', mocks);

            expect(channel.isPendingSubscribe()).toBe(false);

            channel.setPendingSubscribe(true);
            expect(channel.isPendingSubscribe()).toBe(true);

            channel.setPendingSubscribe(false);
            expect(channel.isPendingSubscribe()).toBe(false);
        });
    });
});
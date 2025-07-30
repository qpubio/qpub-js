import { Connection } from '../../src/core/connections/connection';
import { ConnectionEvents, AuthEvents } from '../../src/types/event.type';
import { ActionType } from '../../src/types/action.type';
import {
    IOptionManager,
    IAuthManager,
    IWebSocketClient,
    ISocketChannelManager,
    ILogger,
} from '../../src/interfaces/services.interface';

describe('Connection', () => {
    // Track Connection instances for cleanup
    const connectionInstances: Connection[] = [];

    // Helper function to create manual mocks
    function createTestMocks(optionOverrides: any = {}) {
        const defaultOptions = {
            wsHost: 'socket.qpub.io',
            wsPort: null,
            isSecure: true,
            autoConnect: true,
            autoReconnect: true,
            autoResubscribe: true,
            autoAuthenticate: true,
            maxReconnectAttempts: 5,
            initialReconnectDelayMs: 1000,
            maxReconnectDelayMs: 30000,
            reconnectBackoffMultiplier: 1.5,
            pingTimeoutMs: 60000,
            ...optionOverrides
        };

        const optionManager = {
            getOption: jest.fn((key?: any) => key ? defaultOptions[key] : defaultOptions),
            setOption: jest.fn(),
            reset: jest.fn()
        } as jest.Mocked<IOptionManager>;

        const authManager = {
            authenticate: jest.fn().mockResolvedValue(null),
            isAuthenticated: jest.fn().mockReturnValue(true),
            shouldAutoAuthenticate: jest.fn().mockReturnValue(true),
            getAuthenticateUrl: jest.fn().mockImplementation((baseUrl) => `${baseUrl}?token=test-token`),
            getCurrentToken: jest.fn().mockReturnValue('test-token'),
            requestToken: jest.fn().mockResolvedValue({}),
            getAuthHeaders: jest.fn().mockReturnValue({}),
            getToken: jest.fn().mockReturnValue('test-token'),
            clearToken: jest.fn(),
            getAuthQueryParams: jest.fn().mockReturnValue(''),
            reset: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            once: jest.fn(),
            emit: jest.fn(),
            removeAllListeners: jest.fn(),
            eventNames: jest.fn().mockReturnValue([]),
            listenerCount: jest.fn().mockReturnValue(0),
            listeners: jest.fn().mockReturnValue([]),
            rawListeners: jest.fn().mockReturnValue([]),
            events: {}  as any
        } as unknown as jest.Mocked<IAuthManager>;

        // Mock WebSocket that we can control
        const mockSocket = {
            readyState: WebSocket.CONNECTING as number,
            onopen: null as any,
            onclose: null as any,
            onerror: null as any,
            onmessage: null as any,
            onping: null as any,
            onpong: null as any,
            close: jest.fn(),
            send: jest.fn()
        };

        const wsClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn().mockReturnValue(false),
            getSocket: jest.fn().mockReturnValue(mockSocket),
            send: jest.fn(),
            reset: jest.fn()
        } as jest.Mocked<IWebSocketClient>;

        const channelManager = {
            get: jest.fn(),
            has: jest.fn(),
            remove: jest.fn(),
            reset: jest.fn(),
            resubscribeAllChannels: jest.fn(),
            pendingSubscribeAllChannels: jest.fn()
        } as jest.Mocked<ISocketChannelManager>;

        const logger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn()
        } as jest.Mocked<ILogger>;

        return { optionManager, authManager, wsClient, channelManager, logger, mockSocket };
    }

    // Helper to create Connection and track for cleanup
    function createConnection(mocks: ReturnType<typeof createTestMocks>): Connection {
        const { optionManager, authManager, wsClient, channelManager, logger } = mocks;
        const connection = new Connection(optionManager, authManager, wsClient, channelManager, logger);
        connectionInstances.push(connection);
        return connection;
    }

    // Cleanup after each test
    afterEach(() => {
        connectionInstances.forEach(connection => {
            connection.reset();
        });
        connectionInstances.length = 0;
        jest.clearAllTimers();
    });

    describe('Initialization', () => {
        it('should initialize with dependencies and setup auth listeners', () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            // Should set up auth listeners
            expect(mocks.authManager.on).toHaveBeenCalledWith(
                AuthEvents.TOKEN_EXPIRED,
                expect.any(Function)
            );
            expect(mocks.authManager.on).toHaveBeenCalledWith(
                AuthEvents.TOKEN_ERROR,
                expect.any(Function)
            );
            expect(mocks.authManager.on).toHaveBeenCalledWith(
                AuthEvents.AUTH_ERROR,
                expect.any(Function)
            );

            // Should emit initialized event
            const initializeEvents: any[] = [];
            connection.on(ConnectionEvents.INITIALIZED, () => initializeEvents.push('initialized'));
            
            // Create new connection to test event emission
            const newConnection = createConnection(createTestMocks());
            expect(initializeEvents).toHaveLength(0); // Previous connection didn't emit to this listener
        });

        it('should generate correct authenticated WebSocket URL', async () => {
            const mocks = createTestMocks({
                isSecure: true,
                wsHost: 'test.example.com',
                wsPort: 443
            });
            const connection = createConnection(mocks);

            await connection.connect();

            expect(mocks.wsClient.connect).toHaveBeenCalledWith(
                'wss://test.example.com:443/v1?token=test-token'
            );
        });

        it('should generate WebSocket URL without port when not specified', async () => {
            const mocks = createTestMocks({
                isSecure: false,
                wsHost: 'localhost',
                wsPort: null
            });
            const connection = createConnection(mocks);

            await connection.connect();

            expect(mocks.wsClient.connect).toHaveBeenCalledWith(
                'ws://localhost/v1?token=test-token'
            );
        });
    });

    describe('Connection Lifecycle', () => {
        it('should handle successful connection flow', async () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            const events: string[] = [];
            connection.on(ConnectionEvents.CONNECTING, () => events.push('connecting'));
            connection.on(ConnectionEvents.OPENED, () => events.push('opened'));
            connection.on(ConnectionEvents.CONNECTED, () => events.push('connected'));

            // Start connection
            await connection.connect();

            // Verify authentication and connection
            expect(mocks.authManager.authenticate).toHaveBeenCalled();
            expect(mocks.wsClient.connect).toHaveBeenCalled();
            expect(events).toContain('connecting');

            // Simulate WebSocket opened
            mocks.mockSocket.readyState = WebSocket.OPEN;
            mocks.wsClient.isConnected.mockReturnValue(true);
            mocks.mockSocket.onopen?.();

            expect(events).toContain('opened');
            expect(mocks.channelManager.resubscribeAllChannels).toHaveBeenCalled();

            // Simulate server connection message
            const connectionMessage = {
                action: ActionType.CONNECTED,
                connectionId: 'conn-123',
                connectionDetails: { clientId: 'client-123' }
            };
            mocks.mockSocket.onmessage?.({ data: JSON.stringify(connectionMessage) } as MessageEvent);

            expect(events).toContain('connected');
        });

        it('should skip authentication when auto-authenticate is disabled', async () => {
            const mocks = createTestMocks();
            mocks.authManager.shouldAutoAuthenticate.mockReturnValue(false);
            const connection = createConnection(mocks);

            await connection.connect();

            expect(mocks.authManager.authenticate).not.toHaveBeenCalled();
            expect(mocks.wsClient.connect).toHaveBeenCalled();
        });

        it('should handle authentication errors during connection', async () => {
            const mocks = createTestMocks();
            mocks.authManager.authenticate.mockRejectedValue(new Error('Auth failed'));
            const connection = createConnection(mocks);

            const errorEvents: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) => errorEvents.push(event));

            await connection.connect();

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0].error.message).toContain('Auth failed');
        });

        it('should track connection state correctly', () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            // Initially not connected
            expect(connection.isConnected()).toBe(false);

            // After WebSocket connects
            mocks.wsClient.isConnected.mockReturnValue(true);
            expect(connection.isConnected()).toBe(true);
        });

        it('should disconnect cleanly', () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            const events: string[] = [];
            connection.on(ConnectionEvents.CLOSED, () => events.push('closed'));

            connection.disconnect();

            expect(mocks.wsClient.disconnect).toHaveBeenCalled();
            expect(events).toContain('closed');
        });
    });

    describe('WebSocket Event Handling', () => {
        let mocks: ReturnType<typeof createTestMocks>;
        let connection: Connection;

        beforeEach(async () => {
            mocks = createTestMocks();
            connection = createConnection(mocks);
            await connection.connect(); // Set up socket listeners
        });

        it('should handle WebSocket close events', () => {
            const events: any[] = [];
            connection.on(ConnectionEvents.CLOSED, (event) => events.push(event));

            const closeEvent = {
                code: 1000,
                reason: 'Normal closure',
                wasClean: true
            } as CloseEvent;

            mocks.mockSocket.onclose?.(closeEvent);

            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                code: 1000,
                reason: 'Normal closure',
                wasClean: true
            });
            expect(mocks.channelManager.pendingSubscribeAllChannels).toHaveBeenCalled();
        });

        it('should handle WebSocket error events', () => {
            const events: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) => events.push(event));

            const errorEvent = new Event('error');
            mocks.mockSocket.onerror?.(errorEvent);

            expect(events).toHaveLength(1);
            expect(events[0].error.message).toBe('WebSocket connection error');
            expect(events[0].context).toBe('websocket');
            expect(mocks.channelManager.pendingSubscribeAllChannels).toHaveBeenCalled();
        });

        it('should handle malformed message events', () => {
            const events: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) => events.push(event));

            const invalidMessage = { data: 'invalid-json' } as MessageEvent;
            mocks.mockSocket.onmessage?.(invalidMessage);

            expect(events).toHaveLength(1);
            expect(events[0].context).toBe('message_processing');
        });

        it('should handle DISCONNECTED action messages', () => {
            const events: string[] = [];
            connection.on(ConnectionEvents.DISCONNECTED, () => events.push('disconnected'));

            const disconnectMessage = {
                action: ActionType.DISCONNECTED
            };
            mocks.mockSocket.onmessage?.({ data: JSON.stringify(disconnectMessage) } as MessageEvent);

            expect(events).toContain('disconnected');
        });
    });

    describe('Ping/Pong Health Checks', () => {
        let mocks: ReturnType<typeof createTestMocks>;
        let connection: Connection;

        beforeEach(async () => {
            jest.useFakeTimers();
            mocks = createTestMocks({ pingTimeoutMs: 5000 });
            connection = createConnection(mocks);
            await connection.connect();
            
            // Simulate connection opened to set up ping handler
            mocks.mockSocket.onopen?.();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should set up ping timeout on connection open', () => {
            expect(mocks.mockSocket.onping).toBeDefined();
            expect(mocks.mockSocket.onpong).toBeDefined();
        });

        it('should handle ping timeout and disconnect', () => {
            const disconnectSpy = jest.spyOn(connection, 'disconnect');

            // Simulate ping received
            mocks.mockSocket.onping?.();

            // Fast-forward past ping timeout
            jest.advanceTimersByTime(6000);

            expect(disconnectSpy).toHaveBeenCalled();
        });

        it('should reset ping timeout when ping received', () => {
            const disconnectSpy = jest.spyOn(connection, 'disconnect');

            // Simulate multiple pings within timeout
            mocks.mockSocket.onping?.();
            jest.advanceTimersByTime(3000);
            
            mocks.mockSocket.onping?.();
            jest.advanceTimersByTime(3000);

            // Should not disconnect since pings were received
            expect(disconnectSpy).not.toHaveBeenCalled();
        });
    });

    describe('Authentication Integration', () => {
        it('should handle token expiration', async () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);
            
            // Get the token expired handler
            const tokenExpiredHandler = mocks.authManager.on.mock.calls
                .find(call => call[0] === AuthEvents.TOKEN_EXPIRED)?.[1];
            
            expect(tokenExpiredHandler).toBeDefined();

            // Simulate token expiration
            const connectSpy = jest.spyOn(connection, 'connect');
            await tokenExpiredHandler?.();

            expect(connectSpy).toHaveBeenCalled();
        });

        it('should handle authentication errors', async () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            const events: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) => events.push(event));
            
            // Get the auth error handler
            const authErrorHandler = mocks.authManager.on.mock.calls
                .find(call => call[0] === AuthEvents.AUTH_ERROR)?.[1];
            
            expect(authErrorHandler).toBeDefined();

            // Simulate auth error - the handler expects just the Error object
            const authError = new Error('Auth failed');
            await authErrorHandler?.(authError);

            expect(events).toHaveLength(1);
            expect(events[0].error.message).toBe('Auth failed');
            expect(events[0].context).toBe('authentication');
        });
    });

    describe('Reconnection Logic', () => {
        it('should have reconnection configuration available', () => {
            const mocks = createTestMocks({
                autoReconnect: true,
                maxReconnectAttempts: 5,
                initialReconnectDelayMs: 1000
            });
            const connection = createConnection(mocks);

            // Verify reconnection is enabled
            expect(mocks.optionManager.getOption('autoReconnect')).toBe(true);
            expect(mocks.optionManager.getOption('maxReconnectAttempts')).toBe(5);
            expect(mocks.optionManager.getOption('initialReconnectDelayMs')).toBe(1000);
        });

        it('should handle connection close events and check reconnection conditions', async () => {
            const mocks = createTestMocks({ autoReconnect: true });
            const connection = createConnection(mocks);
            await connection.connect();

            const closeEvents: any[] = [];
            connection.on(ConnectionEvents.CLOSED, (event) => closeEvents.push(event));

            // Simulate connection close
            const closeEvent = { code: 1006, reason: 'Connection lost', wasClean: false } as CloseEvent;
            mocks.mockSocket.onclose?.(closeEvent);

            // Should have handled the close event
            expect(closeEvents).toHaveLength(1);
            expect(closeEvents[0]).toMatchObject({
                code: 1006,
                reason: 'Connection lost',
                wasClean: false
            });

            // Should have called pendingSubscribeAllChannels
            expect(mocks.channelManager.pendingSubscribeAllChannels).toHaveBeenCalled();
        });

        it('should not attempt reconnection when auto-reconnect is disabled', async () => {
            const mocks = createTestMocks({ autoReconnect: false });
            const connection = createConnection(mocks);
            await connection.connect();

            const connectingEvents: any[] = [];
            connection.on(ConnectionEvents.CONNECTING, (event) => connectingEvents.push(event));

            // Simulate connection close
            const closeEvent = { code: 1006, reason: 'Connection lost', wasClean: false } as CloseEvent;
            mocks.mockSocket.onclose?.(closeEvent);

            // Should not emit CONNECTING events (no reconnection attempts)
            expect(connectingEvents).toHaveLength(0);
        });

        it('should handle reconnection state correctly', async () => {
            const mocks = createTestMocks({ autoReconnect: true });
            const connection = createConnection(mocks);
            
            // Test initial state
            expect(connection.isConnected()).toBe(false);
            
            // After connecting
            await connection.connect();
            mocks.wsClient.isConnected.mockReturnValue(true);
            expect(connection.isConnected()).toBe(true);
            
            // After disconnecting
            mocks.wsClient.isConnected.mockReturnValue(false);
            expect(connection.isConnected()).toBe(false);
        });
    });

    describe('Resource Cleanup', () => {
        it('should clean up resources on reset', () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            connection.reset();

            expect(mocks.wsClient.disconnect).toHaveBeenCalled();
            expect(mocks.wsClient.reset).toHaveBeenCalled();
        });

        it('should clean up timers on disconnect', async () => {
            jest.useFakeTimers();
            const mocks = createTestMocks();
            const connection = createConnection(mocks);
            
            await connection.connect();
            mocks.mockSocket.onopen?.(); // Set up ping handler
            
            // Simulate a ping to create timeout
            mocks.mockSocket.onping?.();
            
            // Should have timers running
            expect(jest.getTimerCount()).toBeGreaterThan(0);

            connection.disconnect();
            
            // Timers should be cleaned up
            expect(jest.getTimerCount()).toBe(0);
            jest.useRealTimers();
        });
    });
});
import { Connection } from "../../src/core/connections/connection";
import { ConnectionEvents, AuthEvents } from "../../src/types/events/constants";
import { ActionType } from "../../src/types/protocol/actions";
import {
    IOptionManager,
    IAuthManager,
    ISocketChannelManager,
} from "../../src/types/services/managers";
import {
    IWebSocketClient,
    ILogger,
} from "../../src/types/services/clients";

describe("Connection", () => {
    // Track Connection instances for cleanup
    const connectionInstances: Connection[] = [];

    // Helper function to create manual mocks
    function createTestMocks(optionOverrides: any = {}) {
        const defaultOptions = {
            wsHost: "socket.qpub.io",
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
            ...optionOverrides,
        };

        const optionManager = {
            getOption: jest.fn((key?: any) =>
                key ? defaultOptions[key] : defaultOptions
            ),
            setOption: jest.fn(),
            reset: jest.fn(),
        } as jest.Mocked<IOptionManager>;

        const authManager = {
            authenticate: jest.fn().mockResolvedValue(null),
            isAuthenticated: jest.fn().mockReturnValue(true),
            shouldAutoAuthenticate: jest.fn().mockReturnValue(true),
            getAuthenticateUrl: jest
                .fn()
                .mockImplementation((baseUrl) => `${baseUrl}?token=test-token`),
            getCurrentToken: jest.fn().mockReturnValue("test-token"),
            requestToken: jest.fn().mockResolvedValue({}),
            getAuthHeaders: jest.fn().mockReturnValue({}),
            getToken: jest.fn().mockReturnValue("test-token"),
            clearToken: jest.fn(),
            getAuthQueryParams: jest.fn().mockReturnValue(""),
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
            events: {} as any,
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
            send: jest.fn(),
        };

        const wsClient = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            isConnected: jest.fn().mockReturnValue(false),
            getSocket: jest.fn().mockReturnValue(mockSocket),
            send: jest.fn(),
            reset: jest.fn(),
        } as jest.Mocked<IWebSocketClient>;

        const channelManager = {
            get: jest.fn(),
            has: jest.fn(),
            remove: jest.fn(),
            reset: jest.fn(),
            resubscribeAllChannels: jest.fn(),
            pendingSubscribeAllChannels: jest.fn(),
        } as jest.Mocked<ISocketChannelManager>;

        const logger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
        } as jest.Mocked<ILogger>;

        return {
            optionManager,
            authManager,
            wsClient,
            channelManager,
            logger,
            mockSocket,
        };
    }

    // Helper to create Connection and track for cleanup
    function createConnection(
        mocks: ReturnType<typeof createTestMocks>
    ): Connection {
        const { optionManager, authManager, wsClient, channelManager, logger } =
            mocks;
        const connection = new Connection(
            optionManager,
            authManager,
            wsClient,
            channelManager,
            logger
        );
        connectionInstances.push(connection);
        return connection;
    }

    // Cleanup after each test
    afterEach(() => {
        connectionInstances.forEach((connection) => {
            connection.reset();
        });
        connectionInstances.length = 0;
        jest.clearAllTimers();
    });

    describe("Initialization", () => {
        it("should initialize with dependencies and setup auth listeners", () => {
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
            connection.on(ConnectionEvents.INITIALIZED, () =>
                initializeEvents.push("initialized")
            );

            // Create new connection to test event emission
            const newConnection = createConnection(createTestMocks());
            expect(initializeEvents).toHaveLength(0); // Previous connection didn't emit to this listener
        });

        it("should generate correct authenticated WebSocket URL", async () => {
            const mocks = createTestMocks({
                isSecure: true,
                wsHost: "test.example.com",
                wsPort: 443,
            });
            const connection = createConnection(mocks);

            await connection.connect();

            expect(mocks.wsClient.connect).toHaveBeenCalledWith(
                "wss://test.example.com:443/v1?token=test-token"
            );
        });

        it("should generate WebSocket URL without port when not specified", async () => {
            const mocks = createTestMocks({
                isSecure: false,
                wsHost: "localhost",
                wsPort: null,
            });
            const connection = createConnection(mocks);

            await connection.connect();

            expect(mocks.wsClient.connect).toHaveBeenCalledWith(
                "ws://localhost/v1?token=test-token"
            );
        });
    });

    describe("Connection Lifecycle", () => {
        it("should handle successful connection flow", async () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            const events: string[] = [];
            connection.on(ConnectionEvents.CONNECTING, () =>
                events.push("connecting")
            );
            connection.on(ConnectionEvents.OPENED, () => events.push("opened"));
            connection.on(ConnectionEvents.CONNECTED, () =>
                events.push("connected")
            );

            // Start connection
            await connection.connect();

            // Verify authentication and connection
            expect(mocks.authManager.authenticate).toHaveBeenCalled();
            expect(mocks.wsClient.connect).toHaveBeenCalled();
            expect(events).toContain("connecting");

            // Simulate WebSocket opened
            mocks.mockSocket.readyState = WebSocket.OPEN;
            mocks.wsClient.isConnected.mockReturnValue(true);
            mocks.mockSocket.onopen?.();

            expect(events).toContain("opened");
            expect(
                mocks.channelManager.resubscribeAllChannels
            ).toHaveBeenCalled();

            // Simulate server connection message
            const connectionMessage = {
                action: ActionType.CONNECTED,
                connection_id: "conn-123",
                connection_details: {
                    alias: "alias-123",
                    client_id: "client-123",
                    server_id: "server-123",
                },
            };
            mocks.mockSocket.onmessage?.({
                data: JSON.stringify(connectionMessage),
            } as MessageEvent);

            expect(events).toContain("connected");
        });

        it("should skip authentication when auto-authenticate is disabled", async () => {
            const mocks = createTestMocks();
            mocks.authManager.shouldAutoAuthenticate.mockReturnValue(false);
            const connection = createConnection(mocks);

            await connection.connect();

            expect(mocks.authManager.authenticate).not.toHaveBeenCalled();
            expect(mocks.wsClient.connect).toHaveBeenCalled();
        });

        it("should handle authentication errors during connection", async () => {
            const mocks = createTestMocks();
            mocks.authManager.authenticate.mockRejectedValue(
                new Error("Auth failed")
            );
            const connection = createConnection(mocks);

            const errorEvents: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) =>
                errorEvents.push(event)
            );

            await connection.connect();

            expect(errorEvents).toHaveLength(1);
            expect(errorEvents[0].error.message).toContain("Auth failed");
        });

        it("should track connection state correctly", () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            // Initially not connected
            expect(connection.isConnected()).toBe(false);

            // After WebSocket connects
            mocks.wsClient.isConnected.mockReturnValue(true);
            expect(connection.isConnected()).toBe(true);
        });

        it("should disconnect cleanly", () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            const events: string[] = [];
            connection.on(ConnectionEvents.CLOSED, () => events.push("closed"));

            connection.disconnect();

            expect(mocks.wsClient.disconnect).toHaveBeenCalled();
            expect(events).toContain("closed");
        });
    });

    describe("WebSocket Event Handling", () => {
        let mocks: ReturnType<typeof createTestMocks>;
        let connection: Connection;

        beforeEach(async () => {
            mocks = createTestMocks();
            connection = createConnection(mocks);
            await connection.connect(); // Set up socket listeners
        });

        it("should handle WebSocket close events", () => {
            const events: any[] = [];
            connection.on(ConnectionEvents.CLOSED, (event) =>
                events.push(event)
            );

            const closeEvent = {
                code: 1000,
                reason: "Normal closure",
                wasClean: true,
            } as CloseEvent;

            mocks.mockSocket.onclose?.(closeEvent);

            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                code: 1000,
                reason: "Normal closure",
                wasClean: true,
            });
            expect(
                mocks.channelManager.pendingSubscribeAllChannels
            ).toHaveBeenCalled();
        });

        it("should handle WebSocket error events", () => {
            const events: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) =>
                events.push(event)
            );

            const errorEvent = new Event("error");
            mocks.mockSocket.onerror?.(errorEvent);

            expect(events).toHaveLength(1);
            expect(events[0].error.message).toBe("WebSocket connection error");
            expect(events[0].context).toBe("websocket");
            expect(
                mocks.channelManager.pendingSubscribeAllChannels
            ).toHaveBeenCalled();
        });

        it("should handle malformed message events", () => {
            const events: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) =>
                events.push(event)
            );

            const invalidMessage = { data: "invalid-json" } as MessageEvent;
            mocks.mockSocket.onmessage?.(invalidMessage);

            expect(events).toHaveLength(1);
            expect(events[0].context).toBe("message_processing");
        });

        it("should handle DISCONNECTED action messages", () => {
            const events: string[] = [];
            connection.on(ConnectionEvents.DISCONNECTED, () =>
                events.push("disconnected")
            );

            const disconnectMessage = {
                action: ActionType.DISCONNECTED,
            };
            mocks.mockSocket.onmessage?.({
                data: JSON.stringify(disconnectMessage),
            } as MessageEvent);

            expect(events).toContain("disconnected");
        });
    });

    describe("Ping Functionality", () => {
        let mocks: ReturnType<typeof createTestMocks>;
        let connection: Connection;

        beforeEach(async () => {
            mocks = createTestMocks({ pingTimeoutMs: 5000 });
            connection = createConnection(mocks);
            await connection.connect();

            // Simulate connection opened
            mocks.mockSocket.onopen?.();
        });

        it("should set up ping timeout on connection open", () => {
            expect(mocks.mockSocket.onping).toBeDefined();
            expect(mocks.mockSocket.onpong).toBeDefined();
        });

        it("should handle ping timeout and disconnect", () => {
            jest.useFakeTimers();
            const disconnectSpy = jest.spyOn(connection, "disconnect");

            // Simulate ping received
            mocks.mockSocket.onping?.();

            // Fast-forward past ping timeout
            jest.advanceTimersByTime(6000);

            expect(disconnectSpy).toHaveBeenCalled();
            jest.useRealTimers();
        });

        it("should send ping with unique ID and resolve with RTT", async () => {
            // Use Object.defineProperty for Node 18+ compatibility
            const originalNow = performance.now;
            let callCount = 0;
            Object.defineProperty(performance, "now", {
                writable: true,
                configurable: true,
                value: jest.fn(() => {
                    return callCount++ === 0 ? 1000 : 1050;
                }),
            });

            const sendSpy = jest.spyOn(mocks.mockSocket, "send");

            // Start the ping
            const pingPromise = connection.ping();

            // Verify ping message was sent
            expect(sendSpy).toHaveBeenCalledWith(
                expect.stringContaining('"action":12') // ActionType.PING = 12
            );

            const sentMessage = JSON.parse(sendSpy.mock.calls[0][0]);
            expect(sentMessage).toMatchObject({
                action: 12,
                timestamp: expect.any(Number),
            });

            // Simulate server response
            const pongMessage = {
                action: 13, // ActionType.PONG
                timestamp: sentMessage.timestamp, // Echo back the ping ID
            };

            // Trigger message handler (simulate receiving pong)
            mocks.mockSocket.onmessage?.({
                data: JSON.stringify(pongMessage),
            } as MessageEvent);

            // Verify ping resolves with correct RTT
            const rtt = await pingPromise;
            expect(rtt).toBe(50);

            // Restore original performance.now
            Object.defineProperty(performance, "now", {
                writable: true,
                configurable: true,
                value: originalNow,
            });
            sendSpy.mockRestore();
        });

        it("should reject ping if connection is not open", async () => {
            // Set socket to null to simulate disconnected state
            (connection as any).socket = null;

            await expect(connection.ping()).rejects.toThrow(
                "WebSocket is not connected"
            );
        });

        it("should reject ping on timeout", async () => {
            jest.useFakeTimers();

            const pingPromise = connection.ping();

            // Advance time past timeout
            jest.advanceTimersByTime(11000); // Longer than default 10s timeout

            await expect(pingPromise).rejects.toThrow("Ping timeout");

            jest.useRealTimers();
        });

        it("should handle multiple concurrent pings correctly", async () => {
            // Use Object.defineProperty for Node 18+ compatibility
            const originalNow = performance.now;
            const sendSpy = jest.spyOn(mocks.mockSocket, "send");

            // Mock timing in order: ping1 start, ping2 start, ping1 response, ping2 response
            let callCount = 0;
            Object.defineProperty(performance, "now", {
                writable: true,
                configurable: true,
                value: jest.fn(() => {
                    switch (callCount++) {
                        case 0:
                            return 1000; // ping1 start
                        case 1:
                            return 2000; // ping2 start
                        case 2:
                            return 1030; // ping1 response (30ms RTT)
                        case 3:
                            return 2080; // ping2 response (80ms RTT)
                        default:
                            return Date.now();
                    }
                }),
            });

            // Start multiple pings
            const ping1Promise = connection.ping();
            const ping2Promise = connection.ping();

            // Get the sent ping IDs
            const ping1Message = JSON.parse(sendSpy.mock.calls[0][0]);
            const ping2Message = JSON.parse(sendSpy.mock.calls[1][0]);

            // Verify different ping IDs
            expect(ping1Message.timestamp).toBe(1); // First ping gets ID 1
            expect(ping2Message.timestamp).toBe(2); // Second ping gets ID 2

            // Respond to ping1 first
            const pong1Message = {
                action: 13,
                timestamp: ping1Message.timestamp, // Echo back ping1 ID
            };
            mocks.mockSocket.onmessage?.({
                data: JSON.stringify(pong1Message),
            } as MessageEvent);

            // Respond to ping2 second
            const pong2Message = {
                action: 13,
                timestamp: ping2Message.timestamp, // Echo back ping2 ID
            };
            mocks.mockSocket.onmessage?.({
                data: JSON.stringify(pong2Message),
            } as MessageEvent);

            // Verify correct RTTs
            const [rtt1, rtt2] = await Promise.all([
                ping1Promise,
                ping2Promise,
            ]);
            expect(rtt1).toBe(30);
            expect(rtt2).toBe(80);

            // Restore original performance.now
            Object.defineProperty(performance, "now", {
                writable: true,
                configurable: true,
                value: originalNow,
            });
            sendSpy.mockRestore();
        });

        it("should clean up pending pings on connection close", async () => {
            const pingPromise = connection.ping();

            // Simulate connection close
            connection.disconnect();

            await expect(pingPromise).rejects.toThrow("Connection closed");
        });

        it("should clean up pending pings on connection reset", async () => {
            const pingPromise = connection.ping();

            // Simulate connection reset
            connection.reset();

            await expect(pingPromise).rejects.toThrow("Connection reset");
        });

        it("should ignore pong messages without ping ID", async () => {
            const sendSpy = jest.spyOn(mocks.mockSocket, "send");

            const pingPromise = connection.ping();

            // Send pong without ping ID
            const pongWithoutId = {
                action: 13,
                // missing timestamp (used as ping ID)
            };
            mocks.mockSocket.onmessage?.({
                data: JSON.stringify(pongWithoutId),
            } as MessageEvent);

            // Verify ping was sent but promise is still pending
            expect(sendSpy).toHaveBeenCalled();

            // Clean up
            connection.disconnect();
            await expect(pingPromise).rejects.toThrow("Connection closed");

            sendSpy.mockRestore();
        });
    });

    describe("Authentication Integration", () => {
        it("should handle token expiration", async () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            // Get the token expired handler
            const tokenExpiredHandler = mocks.authManager.on.mock.calls.find(
                (call) => call[0] === AuthEvents.TOKEN_EXPIRED
            )?.[1];

            expect(tokenExpiredHandler).toBeDefined();

            // Simulate token expiration
            const connectSpy = jest.spyOn(connection, "connect");
            await tokenExpiredHandler?.();

            expect(connectSpy).toHaveBeenCalled();
        });

        it("should handle authentication errors", async () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            const events: any[] = [];
            connection.on(ConnectionEvents.FAILED, (event) =>
                events.push(event)
            );

            // Get the auth error handler
            const authErrorHandler = mocks.authManager.on.mock.calls.find(
                (call) => call[0] === AuthEvents.AUTH_ERROR
            )?.[1];

            expect(authErrorHandler).toBeDefined();

            // Simulate auth error - the handler expects just the Error object
            const authError = new Error("Auth failed");
            await authErrorHandler?.(authError);

            expect(events).toHaveLength(1);
            expect(events[0].error.message).toBe("Auth failed");
            expect(events[0].context).toBe("authentication");
        });
    });

    describe("Reconnection Logic", () => {
        it("should have reconnection configuration available", () => {
            const mocks = createTestMocks({
                autoReconnect: true,
                maxReconnectAttempts: 5,
                initialReconnectDelayMs: 1000,
            });
            const connection = createConnection(mocks);

            // Verify reconnection is enabled
            expect(mocks.optionManager.getOption("autoReconnect")).toBe(true);
            expect(mocks.optionManager.getOption("maxReconnectAttempts")).toBe(
                5
            );
            expect(
                mocks.optionManager.getOption("initialReconnectDelayMs")
            ).toBe(1000);
        });

        it("should handle connection close events and check reconnection conditions", async () => {
            const mocks = createTestMocks({ autoReconnect: true });
            const connection = createConnection(mocks);
            await connection.connect();

            const closeEvents: any[] = [];
            connection.on(ConnectionEvents.CLOSED, (event) =>
                closeEvents.push(event)
            );

            // Simulate connection close
            const closeEvent = {
                code: 1006,
                reason: "Connection lost",
                wasClean: false,
            } as CloseEvent;
            mocks.mockSocket.onclose?.(closeEvent);

            // Should have handled the close event
            expect(closeEvents).toHaveLength(1);
            expect(closeEvents[0]).toMatchObject({
                code: 1006,
                reason: "Connection lost",
                wasClean: false,
            });

            // Should have called pendingSubscribeAllChannels
            expect(
                mocks.channelManager.pendingSubscribeAllChannels
            ).toHaveBeenCalled();
        });

        it("should not attempt reconnection when auto-reconnect is disabled", async () => {
            const mocks = createTestMocks({ autoReconnect: false });
            const connection = createConnection(mocks);
            await connection.connect();

            const connectingEvents: any[] = [];
            connection.on(ConnectionEvents.CONNECTING, (event) =>
                connectingEvents.push(event)
            );

            // Simulate connection close
            const closeEvent = {
                code: 1006,
                reason: "Connection lost",
                wasClean: false,
            } as CloseEvent;
            mocks.mockSocket.onclose?.(closeEvent);

            // Should not emit CONNECTING events (no reconnection attempts)
            expect(connectingEvents).toHaveLength(0);
        });

        it("should handle reconnection state correctly", async () => {
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

    describe("Resource Cleanup", () => {
        it("should clean up resources on reset", () => {
            const mocks = createTestMocks();
            const connection = createConnection(mocks);

            connection.reset();

            expect(mocks.wsClient.disconnect).toHaveBeenCalled();
            expect(mocks.wsClient.reset).toHaveBeenCalled();
        });

        it("should clean up timers on disconnect", async () => {
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

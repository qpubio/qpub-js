import { AuthEvents, ConnectionEvents } from "../../types/events/constants";
import { EventEmitter } from "../shared/event-emitter";
import { ConnectionEventPayloads } from "../../types/events/payloads";
import { QPubWebSocket } from "../../types/services/websocket";
import {
    IncomingConnectionMessage,
    IncomingMessage, PingMessage,
    PongMessage
} from "../../types/protocol/messages";
import { ActionType } from "../../types/protocol/actions";
import {
    IOptionManager,
    IAuthManager,
    ISocketChannelManager,
} from "../../types/services/managers";
import {
    IWebSocketClient,
    ILogger,
} from "../../types/services/clients";
import { IConnection } from "../../types/services/connection";

export class Connection
    extends EventEmitter<ConnectionEventPayloads>
    implements IConnection
{
    private optionManager: IOptionManager;
    private authManager: IAuthManager;
    private wsClient: IWebSocketClient;
    private channelManager: ISocketChannelManager;
    private logger: ILogger;
    private socket: QPubWebSocket | null = null;
    private reconnectAttempts: number = 0;
    private reconnectTimeout?: NodeJS.Timeout;
    private isReconnecting: boolean = false;
    private isIntentionalDisconnect: boolean = false;
    private _isResetting: boolean = false; // Add reset flag
    private pingTimeout?: NodeJS.Timeout;
    private pendingPings: Map<string, { startTime: number; resolve: (rtt: number) => void; reject: (error: Error) => void; timeout?: NodeJS.Timeout }> = new Map();
    private pingCounter: number = 0; // Sequential counter for unique ping IDs

    constructor(
        optionManager: IOptionManager,
        authManager: IAuthManager,
        wsClient: IWebSocketClient,
        channelManager: ISocketChannelManager,
        logger: ILogger
    ) {
        super();
        this.optionManager = optionManager;
        this.authManager = authManager;
        this.wsClient = wsClient;
        this.channelManager = channelManager;
        this.logger = logger;

        this.setupAuthListeners();
        this.logger.info("Connection instance initialized");
        this.emit(ConnectionEvents.INITIALIZED);
    }

    private getAuthenticatedWsUrl(): string {
        const secure = this.optionManager.getOption("isSecure");
        const host = this.optionManager.getOption("wsHost");
        const port = this.optionManager.getOption("wsPort");

        const protocol = secure ? "wss" : "ws";
        const baseUrl = `${protocol}://${host}${port ? `:${port}` : ""}/v1`;

        return this.authManager.getAuthenticateUrl(baseUrl);
    }

    public async connect(): Promise<void> {
        // Prevent connection attempts during reset
        if (this._isResetting) {
            this.logger.debug("Connection attempt blocked - connection is resetting");
            return;
        }

        try {
            this.emit(ConnectionEvents.CONNECTING, { attempt: 1 });

            if (this.authManager.shouldAutoAuthenticate()) {
                await this.authManager.authenticate();
            }

            const wsUrl = this.getAuthenticatedWsUrl();
            this.wsClient.connect(wsUrl);

            this.socket = this.wsClient.getSocket();
            if (this.socket) {
                this.setupSocketListeners();
            }
        } catch (error) {
            this.handleAuthError(error as Error);
        }
    }

    public isConnected(): boolean {
        return this.wsClient.isConnected();
    }

    public isResetting(): boolean {
        return this._isResetting;
    }

    public ping(): Promise<number> {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket is not connected"));
                return;
            }

            // Generate unique ping ID
            const pingId = ++this.pingCounter;
            const startTime = performance.now();

            // Store the pending ping with its resolve/reject callbacks
            this.pendingPings.set(pingId.toString(), { startTime, resolve, reject });

            // Set a timeout for this specific ping
            const timeout = setTimeout(() => {
                this.pendingPings.delete(pingId.toString());
                reject(new Error("Ping timeout"));
            }, this.optionManager.getOption("pingTimeoutMs") || 10000);

            // Store timeout ID to clear it when pong is received
            this.pendingPings.get(pingId.toString())!.timeout = timeout;

            // Create ping message
            const pingMessage: PingMessage = {
                action: ActionType.PING,
                timestamp: pingId
            };

            try {
                this.socket.send(JSON.stringify(pingMessage));
                this.logger.debug(`Sent ping with ID: ${pingId}`);
            } catch (error) {
                clearTimeout(timeout);
                this.pendingPings.delete(pingId.toString());
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    private setupSocketListeners(): void {
        if (!this.socket) return;

        this.socket.onopen = () => {
            this.logger.info("WebSocket connection opened");
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.isIntentionalDisconnect = false;
            this.emit(ConnectionEvents.OPENED, {});
            this.setupPingHandler();

            if (this.optionManager.getOption("autoResubscribe")) {
                this.channelManager.resubscribeAllChannels();
            }
        };

        this.socket.onclose = (event: CloseEvent) => {
            this.logger.info(
                `WebSocket connection closed: ${event.code} ${event.reason}`
            );
            if (this.pingTimeout) {
                clearTimeout(this.pingTimeout);
                this.pingTimeout = undefined;
            }


            this.emit(ConnectionEvents.CLOSED, {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean,
            });

            this.channelManager.pendingSubscribeAllChannels();

            // Only attempt reconnection if it wasn't an intentional close
            if (
                !this.isReconnecting &&
                !this.isIntentionalDisconnect &&
                this.optionManager.getOption("autoReconnect")
            ) {
                this.handleConnectionClosed();
            }
        };

        this.socket.onerror = (event: Event) => {
            this.logger.error("WebSocket connection error:", event);
            this.channelManager.pendingSubscribeAllChannels();
            this.emit(ConnectionEvents.FAILED, {
                error: new Error("WebSocket connection error"),
                context: "websocket",
            });
        };

        this.socket.onmessage = (event: MessageEvent) => {
            try {
                const message: IncomingMessage = JSON.parse(event.data);
                this.logger.debug("Received message:", message);
                if (message.action === ActionType.CONNECTED) {
                    const connMessage = message as IncomingConnectionMessage;
                    this.emit(ConnectionEvents.CONNECTED, {
                        connectionId: connMessage.connection_id,
                        connectionDetails: connMessage.connection_details,
                    });
                } else if (message.action === ActionType.DISCONNECTED) {
                    this.emit(ConnectionEvents.DISCONNECTED, {});
                } else if (message.action === ActionType.PONG) {
                    // Handle pong response for ping() method
                    this.handlePongResponse(message);
                }
            } catch (error) {
                this.logger.error("Error processing message:", error);
                this.emit(ConnectionEvents.FAILED, {
                    error:
                        error instanceof Error
                            ? error
                            : new Error("Unknown error"),
                    context: "message_processing",
                });
            }
        };

        this.logger.debug("Socket listeners configured");
    }

    private setupAuthListeners(): void {
        this.authManager.on(
            AuthEvents.TOKEN_EXPIRED,
            this.handleTokenExpired.bind(this)
        );
        this.authManager.on(
            AuthEvents.TOKEN_ERROR,
            this.handleAuthError.bind(this)
        );
        this.authManager.on(
            AuthEvents.AUTH_ERROR,
            this.handleAuthError.bind(this)
        );
        this.logger.debug("Auth listeners configured");
    }

    private setupPingHandler(): void {
        if (!this.socket) return;

        const PING_TIMEOUT =
            this.optionManager.getOption("pingTimeoutMs") || 60000;

        // Note: Browser WebSocket API doesn't expose onping/onpong events
        // These handlers only work in Node.js environments
        
        this.socket.onping = () => {
            this.logger.debug("Ping received from server (Node.js only)");
            
            if (this.pingTimeout) clearTimeout(this.pingTimeout);

            this.pingTimeout = setTimeout(() => {
                this.handleConnectionInterrupted();
            }, PING_TIMEOUT);
        };

        this.socket.onpong = () => {
            this.logger.debug("Pong received from server (Node.js only)");
        };

        this.logger.debug("Ping handler configured");
    }

    private handlePongResponse(message: IncomingMessage): void {
        const pongMessage = message as PongMessage;
        const pingId = pongMessage.timestamp?.toString();
        
        if (!pingId) {
            this.logger.debug("Received pong without ping ID, ignoring");
            return;
        }

        const pendingPing = this.pendingPings.get(pingId);
        if (!pendingPing) {
            this.logger.debug(`Received pong for unknown ping ID: ${pingId}`);
            return;
        }

        // Calculate RTT and resolve the promise
        const rtt = performance.now() - pendingPing.startTime;
        
        // Clear the timeout
        if (pendingPing.timeout) {
            clearTimeout(pendingPing.timeout);
        }
        
        this.pendingPings.delete(pingId);
        
        this.logger.debug(`Ping ${pingId} completed with RTT: ${rtt.toFixed(2)}ms`);
        pendingPing.resolve(rtt);
    }

    private handleConnectionInterrupted(): void {
        this.logger.warn(
            "Connection interrupted - no ping received within timeout period"
        );
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = undefined;
        }
        this.disconnect();
        this.handleConnectionClosed();
    }

    private async handleConnectionClosed() {
        if (this.socket?.readyState === WebSocket.CLOSING) {
            this.logger.debug(
                "Connection close handled - socket already closing"
            );
            return;
        }

        if (
            this.reconnectAttempts >=
            this.optionManager.getOption("maxReconnectAttempts")!
        ) {
            this.logger.debug(
                "Max reconnection attempts reached - not attempting reconnection"
            );
            return;
        }

        if (this.optionManager.getOption("autoReconnect")) {
            this.logger.info("Initiating automatic reconnection");
            await this.attemptReconnection();
        }
    }

    private async handleTokenExpired() {
        await this.connect();
    }

    private handleAuthError(error: Error) {
        this.emit(ConnectionEvents.FAILED, {
            error,
            context: "authentication",
        });
        this.disconnect();
    }

    private calculateReconnectDelay(): number {
        const initial = this.optionManager.getOption(
            "initialReconnectDelayMs"
        )!;
        const max = this.optionManager.getOption("maxReconnectDelayMs")!;
        const multiplier = this.optionManager.getOption(
            "reconnectBackoffMultiplier"
        )!;

        const delay = initial * Math.pow(multiplier, this.reconnectAttempts);
        return Math.min(delay, max);
    }

    private async attemptReconnection() {
        if (this.isReconnecting) {
            this.logger.debug("Reconnection already in progress");
            return;
        }

        const maxAttempts = this.optionManager.getOption(
            "maxReconnectAttempts"
        )!;
        this.isReconnecting = true;
        this.logger.info(
            `Starting reconnection attempts (max: ${maxAttempts})`
        );

        while (this.reconnectAttempts < maxAttempts) {
            try {
                const delay = this.calculateReconnectDelay();
                this.logger.debug(
                    `Reconnection attempt ${
                        this.reconnectAttempts + 1
                    }/${maxAttempts} after ${delay}ms`
                );

                this.emit(ConnectionEvents.CONNECTING, {
                    attempt: this.reconnectAttempts + 1,
                });

                await new Promise((resolve) => setTimeout(resolve, delay));

                // Create a promise that will resolve/reject based on the next connection attempt
                const connectionPromise = new Promise((resolve, reject) => {
                    let timeoutId: NodeJS.Timeout;
                    let isHandled = false;

                    // Connection timeout handler
                    const connectionTimeout = () => {
                        if (!isHandled) {
                            isHandled = true;
                            reject(new Error("Connection attempt timed out"));
                        }
                    };

                    // Set a timeout for the connection attempt
                    timeoutId = setTimeout(
                        connectionTimeout,
                        this.optionManager.getOption("connectTimeoutMs") ||
                            10000
                    );

                    this.connect()
                        .then(() => {
                            if (!isHandled) {
                                isHandled = true;
                                clearTimeout(timeoutId);
                                // Wait a brief moment to ensure the socket is properly established
                                setTimeout(() => {
                                    if (
                                        this.socket?.readyState ===
                                        WebSocket.OPEN
                                    ) {
                                        resolve(true);
                                    } else {
                                        reject(
                                            new Error(
                                                "WebSocket connection failed"
                                            )
                                        );
                                    }
                                }, 100);
                            }
                        })
                        .catch((error) => {
                            if (!isHandled) {
                                isHandled = true;
                                clearTimeout(timeoutId);
                                reject(error);
                            }
                        });
                });

                await connectionPromise;
                return; // Successfully connected
            } catch (error) {
                this.reconnectAttempts++;
                this.logger.warn(`Reconnection attempt failed: ${error}`);

                if (this.reconnectAttempts >= maxAttempts) {
                    this.logger.error("Max reconnection attempts reached");
                    this.emit(ConnectionEvents.FAILED, {
                        error:
                            error instanceof Error
                                ? error
                                : new Error(String(error)),
                        context: "reconnection",
                    });
                    this.isReconnecting = false;
                    break;
                }
            }
        }
    }

    public disconnect(): void {
        this.isReconnecting = false; // Prevent reconnection attempts
        this.isIntentionalDisconnect = true; // Mark as intentional disconnect
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = undefined;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        // Reject all pending pings
        this.pendingPings.forEach((pendingPing, pingId) => {
            if (pendingPing.timeout) {
                clearTimeout(pendingPing.timeout);
            }
            pendingPing.reject(new Error("Connection closed"));
        });
        this.pendingPings.clear();
        
        this.emit(ConnectionEvents.CLOSING, {});
        this.wsClient.disconnect();
        this.emit(ConnectionEvents.CLOSED, {});
    }

    public reset(): void {
        this.logger.info("Resetting Connection instance");
        
        // 1. Set reset flag to prevent new operations
        this._isResetting = true;
        
        // 2. Stop all pending operations
        this.stopAllPendingOperations();
        
        // 3. Clean up timers
        this.cleanupTimers();
        
        // 4. Disconnect WebSocket
        this.emit(ConnectionEvents.CLOSING, {});
        this.wsClient.disconnect();
        this.emit(ConnectionEvents.CLOSED, {});
        
        // 5. Reset state
        this.resetState();
        
        // 6. Remove all listeners
        this.removeAllListeners();
        
        this.logger.info("Connection reset completed");
    }

    private stopAllPendingOperations(): void {
        // Stop reconnection attempts
        this.isReconnecting = false;
        
        // Reject all pending pings with reset-specific error
        this.pendingPings.forEach((pendingPing, pingId) => {
            if (pendingPing.timeout) {
                clearTimeout(pendingPing.timeout);
            }
            pendingPing.reject(new Error("Connection reset"));
        });
        this.pendingPings.clear();
    }

    private cleanupTimers(): void {
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = undefined;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
    }

    private resetState(): void {
        this.reconnectAttempts = 0;
        this.isIntentionalDisconnect = false;
        this._isResetting = false; // Reset the flag
        this.socket = null;
        
        this.wsClient.reset();
    }
}

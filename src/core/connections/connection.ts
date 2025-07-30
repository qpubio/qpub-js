import { AuthEvents, ConnectionEvents } from "../../types/event.type";
import { EventEmitter } from "../shared/event-emitter";
import { ConnectionEventPayloads } from "../../types/internal-events";
import { OptionManager } from "../managers/option-manager";
import { WebSocketClient } from "./websocket-client";
import { QPubWebSocket } from "../../interfaces/websocket.interface";
import { IncomingConnectionMessage, IncomingMessage, ErrorInfo } from "../../interfaces/message.interface";
import { ActionType } from "../../types/action.type";
import { AuthManager } from "../managers/auth-manager";
import { Logger } from "../shared/logger";
import { SocketChannelManager } from "../managers/channel-manager";

class Connection extends EventEmitter<ConnectionEventPayloads> {
    private static instances: Map<string, Connection> = new Map();
    private instanceId: string;
    private optionManager: OptionManager;
    private authManager: AuthManager;
    private wsClient: WebSocketClient;
    private channelManager: SocketChannelManager;
    private logger: Logger;
    private socket: QPubWebSocket | null = null;
    private reconnectAttempts: number = 0;
    private reconnectTimeout?: NodeJS.Timeout;
    private isReconnecting: boolean = false;
    private pingTimeout?: NodeJS.Timeout;

    private constructor(instanceId: string) {
        super();
        this.instanceId = instanceId;
        this.optionManager = OptionManager.getInstance(this.instanceId);
        this.authManager = AuthManager.getInstance(this.instanceId);
        this.wsClient = WebSocketClient.getInstance(this.instanceId);
        this.channelManager = SocketChannelManager.getInstance(this.instanceId);
        this.logger = new Logger(this.instanceId, "Connection");

        this.setupAuthListeners();
        this.logger.info("Connection instance initialized");
        this.emit(ConnectionEvents.INITIALIZED);
    }

    public static getInstance(instanceId: string): Connection {
        if (!Connection.instances.has(instanceId)) {
            Connection.instances.set(instanceId, new Connection(instanceId));
        }
        return Connection.instances.get(instanceId)!;
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

    private setupSocketListeners(): void {
        if (!this.socket) return;

        this.socket.onopen = () => {
            this.logger.info("WebSocket connection opened");
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
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
                wasClean: event.wasClean 
            });

            this.channelManager.pendingSubscribeAllChannels();

            // Only attempt reconnection if it wasn't an intentional close
            if (
                !this.isReconnecting &&
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
                context: "websocket" 
            });
        };

        this.socket.onmessage = (event: MessageEvent) => {
            try {
                const message: IncomingMessage = JSON.parse(event.data);
                this.logger.debug("Received message:", message);
                if (message.action === ActionType.CONNECTED) {
                    const connMessage = message as IncomingConnectionMessage;
                    this.emit(ConnectionEvents.CONNECTED, { 
                        connectionId: connMessage.connectionId,
                        connectionDetails: connMessage.connectionDetails 
                    });
                } else if (message.action === ActionType.DISCONNECTED) {
                    this.emit(ConnectionEvents.DISCONNECTED, {});
                }
            } catch (error) {
                this.logger.error("Error processing message:", error);
                this.emit(ConnectionEvents.FAILED, { 
                    error: error instanceof Error ? error : new Error("Unknown error"), 
                    context: "message_processing" 
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

        this.socket.onping = () => {
            this.logger.debug("Ping received from server");
            if (this.pingTimeout) clearTimeout(this.pingTimeout);

            this.pingTimeout = setTimeout(() => {
                this.handleConnectionInterrupted();
            }, PING_TIMEOUT);
        };

        this.socket.onpong = () => {
            this.logger.debug("Pong received from server");
        };

        this.logger.debug("Ping handler configured");
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
        this.emit(ConnectionEvents.FAILED, { error, context: "authentication" });
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
                    attempt: this.reconnectAttempts + 1
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
                        error: error instanceof Error ? error : new Error(String(error)),
                        context: "reconnection"
                    });
                    this.isReconnecting = false;
                    break;
                }
            }
        }
    }

    public disconnect(): void {
        this.isReconnecting = false; // Prevent reconnection attempts
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = undefined;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.emit(ConnectionEvents.CLOSING, {});
        this.wsClient.disconnect();
        this.emit(ConnectionEvents.CLOSED, {});
    }

    public reset(): void {
        this.disconnect();
        this.reconnectAttempts = 0;
        this.wsClient.reset();

        this.removeAllListeners();
        Connection.instances.delete(this.instanceId);
    }
}

export { Connection };

import { QPubWebSocket } from "../../types/services/websocket";
import { IWebSocketClient, ILogger } from "../../types/services/clients";

export class WebSocketClient implements IWebSocketClient {
    private socket: QPubWebSocket | null = null;
    private WebSocketImplementation: any;
    private logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;

        if (typeof window !== "undefined" && window.WebSocket) {
            this.WebSocketImplementation = window.WebSocket;
        } else {
            try {
                this.WebSocketImplementation = require("ws");
            } catch (e) {
                this.logger.error(
                    "WebSocket is not supported in this environment"
                );
                throw new Error(
                    "WebSocket is not supported in this environment"
                );
            }
        }
    }

    public getSocket(): QPubWebSocket | null {
        return this.socket;
    }

    public connect(url: string): void {
        if (this.socket) {
            this.logger.info("Closing existing WebSocket connection");
            this.disconnect();
        }

        this.logger.info(`Connecting to WebSocket at ${url}`);
        this.socket = new this.WebSocketImplementation(url) as QPubWebSocket;

        this.socket.onerror = (error: Event) => {
            this.logger.error("WebSocket error:", error);
            // Don't disconnect here - let the Connection class handle it
        };
    }

    public isConnected(): boolean {
        return (
            this.socket !== null && this.socket.readyState === WebSocket.OPEN
        );
    }

    public disconnect(): void {
        if (this.socket) {
            if (this.socket.readyState < WebSocket.CLOSING) {
                try {
                    this.logger.info("Closing WebSocket connection");
                    this.socket.close();
                } catch (error) {
                    this.logger.error("Error closing socket:", error);
                }
            }
            this.socket = null;
        }
    }

    public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.logger.error("Attempted to send data on a closed WebSocket");
            throw new Error("WebSocket is not connected");
        }
        this.logger.debug(`Sending data: ${data}`);
        this.socket.send(data);
    }

    public reset(): void {
        this.logger.info("Resetting WebSocketClient instance");
        // In the normal case, the connection will be closed by the Connection class when it is reset
        // However, in the case of direct reset, we need to disconnect the socket
        if (this.isConnected()) {
            this.disconnect();
        }
    }
}

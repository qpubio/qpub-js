import { QPubWebSocket } from "interfaces/websocket.interface";
import { Logger } from "../utils/logger";

class WebSocketClient {
    private static instances: Map<string, WebSocketClient> = new Map();
    private instanceId: string;
    private socket: QPubWebSocket | null = null;
    private WebSocketImplementation: any;
    private logger: Logger;

    private constructor(instanceId: string) {
        this.instanceId = instanceId;
        this.logger = new Logger(instanceId, "WebSocketClient");

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

    public static getInstance(instanceId: string): WebSocketClient {
        if (!WebSocketClient.instances.has(instanceId)) {
            WebSocketClient.instances.set(
                instanceId,
                new WebSocketClient(instanceId)
            );
        }
        return WebSocketClient.instances.get(instanceId)!;
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
        WebSocketClient.instances.delete(this.instanceId);
    }
}

export { WebSocketClient };

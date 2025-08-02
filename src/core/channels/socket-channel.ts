import { ActionType } from "../../types/action.type";
import { BaseChannel } from "./channel";
import { IWebSocketClient } from "../../interfaces/services.interface";
import { ChannelEvents } from "../../types/event.type";
import {
    OutgoingChannelMessage,
    DataMessagePayload,
    IncomingDataMessage,
    OutgoingDataMessage,
    Message,
} from "../../interfaces/message.interface";

export class SocketChannel extends BaseChannel {
    private wsClient: IWebSocketClient;
    private subscribed: boolean = false;
    private pendingSubscribe: boolean = false;
    private messageCallback?: (message: Message) => void;
    private messageHandler?: (event: MessageEvent) => void;

    constructor(name: string, wsClient: IWebSocketClient) {
        super(name);
        this.wsClient = wsClient;
        this.setupMessageHandler();
    }

    private setupMessageHandler(): void {
        const socket = this.wsClient.getSocket();
        if (!socket) {
            return;
        }

        if (this.messageHandler) {
            socket.removeEventListener("message", this.messageHandler);
        }

        this.messageHandler = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.channel === this.name) {
                    this.handleMessage(message);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                this.emit(ChannelEvents.FAILED, {
                    channelName: this.name,
                    error:
                        error instanceof Error
                            ? error
                            : new Error("Unknown error"),
                    action: "message_parsing",
                });
            }
        };
        socket.addEventListener("message", this.messageHandler);
    }

    /**
     * Transforms an IncomingDataMessage to an array of consumer Message objects.
     * Each DataMessagePayload in the messages array becomes a separate Message.
     */
    private transformToConsumerMessages(
        incomingMessage: IncomingDataMessage
    ): Message[] {
        const { id, timestamp, channel, action, error, messages } =
            incomingMessage;

        return messages.map(
            (messagePayload): Message => ({
                // Base message fields
                action,
                error,
                // Container message fields
                id,
                timestamp,
                channel,
                // Individual message payload fields
                clientId: messagePayload.clientId,
                event: messagePayload.event,
                data: messagePayload.data,
            })
        );
    }

    private handleMessage(message: any): void {
        switch (message.action) {
            case ActionType.MESSAGE:
                if (this.isSubscribed()) {
                    const incomingDataMessage = message as IncomingDataMessage;
                    const consumerMessages =
                        this.transformToConsumerMessages(incomingDataMessage);

                    // Call the callback for each individual message
                    consumerMessages.forEach((consumerMessage) => {
                        this.messageCallback?.(consumerMessage);
                    });
                }
                break;

            case ActionType.SUBSCRIBED:
                this.subscribed = true;
                this.pendingSubscribe = false;
                this.emit(ChannelEvents.SUBSCRIBED, {
                    channelName: this.name,
                    subscriptionId: message.subscriptionId || "",
                });
                break;

            case ActionType.UNSUBSCRIBED:
                this.subscribed = false;
                this.pendingSubscribe = false;
                this.messageCallback = undefined;
                this.emit(ChannelEvents.UNSUBSCRIBED, {
                    channelName: this.name,
                    subscriptionId: message.subscriptionId,
                });
                break;

            case ActionType.ERROR:
                this.emit(ChannelEvents.FAILED, {
                    channelName: this.name,
                    error: message.error || new Error("Unknown channel error"),
                    action: "channel_operation",
                });
                break;
        }
    }

    public async publish(
        data: any,
        event?: string,
        clientId?: string
    ): Promise<void> {
        if (!this.wsClient.isConnected()) {
            throw new Error("Cannot publish: WebSocket is not connected");
        }

        try {
            const messagePayload: DataMessagePayload = {
                data,
                event,
                clientId,
            };

            const publishMessage: OutgoingDataMessage = {
                action: ActionType.PUBLISH,
                channel: this.name,
                messages: [messagePayload],
            };

            this.wsClient.send(JSON.stringify(publishMessage));
        } catch (error) {
            this.emit(ChannelEvents.FAILED, {
                channelName: this.name,
                error:
                    error instanceof Error ? error : new Error("Unknown error"),
                action: "publish",
            });
            throw error;
        }
    }

    public subscribe(callback: (message: Message) => void): void {
        if (!this.wsClient.isConnected()) {
            this.pendingSubscribe = true;
            throw new Error("Cannot subscribe: WebSocket is not connected");
        }

        if (this.isSubscribed() && !this.pendingSubscribe) {
            // Channel is already subscribed, just update the callback
            this.messageCallback = callback;
            // Ensure message handler is set up (in case it wasn't during construction)
            this.setupMessageHandler();
            return;
        }

        this.emit(ChannelEvents.SUBSCRIBING, {
            channelName: this.name,
        });
        this.messageCallback = callback;
        this.pendingSubscribe = false;

        // Ensure message handler is properly set up (in case it wasn't during construction)
        this.setupMessageHandler();

        const actionMessage: OutgoingChannelMessage = {
            action: ActionType.SUBSCRIBE,
            channel: this.name,
        };
        this.wsClient.send(JSON.stringify(actionMessage));
    }

    public async resubscribe(): Promise<void> {
        // Only resubscribe if we have a callback (someone was subscribed)
        if (!this.messageCallback) {
            return;
        }

        try {
            // Ensure message handler is set up before resubscribing
            this.setupMessageHandler();
            // Store the current callback before subscribing
            const existingCallback = this.messageCallback;
            this.subscribe(existingCallback);
        } catch (error) {
            this.emit(ChannelEvents.FAILED, {
                channelName: this.name,
                error:
                    error instanceof Error ? error : new Error("Unknown error"),
                action: "resubscribe",
            });
            throw error;
        }
    }

    public unsubscribe(): void {
        if (!this.isSubscribed()) {
            return;
        }

        // If WebSocket is not connected, just clean up local state
        if (!this.wsClient.isConnected()) {
            this.subscribed = false;
            this.messageCallback = undefined;
            this.emit(ChannelEvents.UNSUBSCRIBED, {
                channelName: this.name,
            });
            return;
        }

        this.emit(ChannelEvents.UNSUBSCRIBING, {
            channelName: this.name,
        });

        const actionMessage: OutgoingChannelMessage = {
            action: ActionType.UNSUBSCRIBE,
            channel: this.name,
        };
        this.wsClient.send(JSON.stringify(actionMessage));
    }

    public isSubscribed(): boolean {
        return this.subscribed;
    }

    public isPendingSubscribe(): boolean {
        return this.pendingSubscribe;
    }

    public setPendingSubscribe(pending: boolean): void {
        this.pendingSubscribe = pending;
    }

    public reset(): void {
        const socket = this.wsClient.getSocket();
        if (socket && this.messageHandler) {
            socket.removeEventListener("message", this.messageHandler);
            this.messageHandler = undefined;
        }

        // Only attempt to unsubscribe if WebSocket is still connected
        // If disconnected, the server will handle cleanup automatically
        if (this.isSubscribed() && this.wsClient.isConnected()) {
            try {
                this.unsubscribe();
            } catch (error) {
                // Log error but don't throw to prevent blocking reset
                console.warn(
                    `Failed to unsubscribe from channel ${this.name} during reset:`,
                    error
                );
            }
        }

        // Reset local state regardless of unsubscribe success
        this.subscribed = false;
        this.messageCallback = undefined;
        this.pendingSubscribe = false;
        this.removeAllListeners();
    }
}

import { ActionType } from "types/action.type";
import { BaseChannel } from "./channel";
import { WebSocketClient } from "./websocket-client";
import { ChannelEvents } from "types/event.type";
import {
    IncomingChannelMessage,
    OutgoingChannelMessage,
    DataMessagePayload,
    IncomingDataMessage,
    OutgoingDataMessage,
    Message,
} from "interfaces/message.interface";

export class SocketChannel extends BaseChannel {
    private wsClient: WebSocketClient;
    private subscribed: boolean = false;
    private pendingSubscribe: boolean = false;
    private messageCallback?: (message: Message) => void;
    private messageHandler?: (event: MessageEvent) => void;

    constructor(name: string, wsClient: WebSocketClient) {
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
                this.emit(ChannelEvents.FAILED, error);
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
                this.emit(ChannelEvents.SUBSCRIBED);
                break;

            case ActionType.UNSUBSCRIBED:
                this.subscribed = false;
                this.pendingSubscribe = false;
                this.messageCallback = undefined;
                this.emit(ChannelEvents.UNSUBSCRIBED);
                break;

            case ActionType.ERROR:
                this.emit(ChannelEvents.FAILED, message.error);
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
            this.emit(ChannelEvents.FAILED, error);
            throw error;
        }
    }

    public subscribe(callback: (message: Message) => void): void {
        if (!this.wsClient.isConnected()) {
            this.pendingSubscribe = true;
            throw new Error("Cannot subscribe: WebSocket is not connected");
        }

        if (this.isSubscribed() && !this.pendingSubscribe) {
            return;
        }

        this.emit(ChannelEvents.SUBSCRIBING);
        this.messageCallback = callback;
        this.pendingSubscribe = false;

        const actionMessage: OutgoingChannelMessage = {
            action: ActionType.SUBSCRIBE,
            channel: this.name,
        };
        this.wsClient.send(JSON.stringify(actionMessage));
    }

    public async resubscribe(): Promise<void> {
        if (!this.messageCallback || !this.pendingSubscribe) {
            return;
        }

        try {
            this.setupMessageHandler();
            this.subscribe(this.messageCallback);
        } catch (error) {
            this.emit(ChannelEvents.FAILED, error);
            throw error;
        }
    }

    public unsubscribe(): void {
        if (!this.wsClient.isConnected()) {
            throw new Error("Cannot unsubscribe: WebSocket is not connected");
        }

        if (!this.isSubscribed()) {
            return;
        }

        this.emit(ChannelEvents.UNSUBSCRIBING);

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

        if (this.isSubscribed()) {
            this.unsubscribe();
        }

        this.messageCallback = undefined;
        this.pendingSubscribe = false;
        this.removeAllListeners();
    }
}

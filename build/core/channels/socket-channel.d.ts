import { BaseChannel } from "./channel";
import { IWebSocketClient, ILogger } from "../../types/services/clients";
import { Message } from "../../types/protocol/messages";
import { PublishOptions, SubscribeOptions } from "../../types/services/channel";
export declare class SocketChannel extends BaseChannel {
    private wsClient;
    private logger;
    private subscribed;
    private pendingSubscribe;
    private pendingUnsubscribe;
    private operationQueue;
    private paused;
    private pausedMessages;
    private bufferWhilePaused;
    private messageCallback?;
    private messageHandler;
    private eventCallbacks;
    private pendingTimeouts;
    constructor(name: string, wsClient: IWebSocketClient, logger: ILogger);
    private setupMessageHandler;
    /**
     * Processes the next operation in the queue if the channel is in a stable state.
     * This is called after receiving SUBSCRIBED or UNSUBSCRIBED acknowledgments.
     */
    private processOperationQueue;
    /**
     * Transforms an IncomingDataMessage to an array of consumer Message objects.
     * Each DataMessagePayload in the messages array becomes a separate Message.
     */
    private transformToConsumerMessages;
    private handleMessage;
    /**
     * Publish a message to the channel.
     * Note: This is a fire-and-forget operation - no server acknowledgment is expected.
     * The Promise resolves immediately after sending, not after delivery confirmation.
     */
    publish(data: any, options?: PublishOptions): Promise<void>;
    /**
     * Subscribe to channel messages. Returns a Promise that resolves when subscription is confirmed.
     * Can be used with or without await:
     * - Fire-and-forget: channel.subscribe(callback)
     * - Wait for confirmation: await channel.subscribe(callback)
     */
    subscribe(callback: (message: Message) => void, options?: SubscribeOptions & {
        timeout?: number;
    }): Promise<void>;
    /**
     * Internal method that synchronously executes the subscribe operation.
     * This is called either immediately or after processing the queue.
     */
    private executeSubscribe;
    resubscribe(): Promise<void>;
    /**
     * Unsubscribe from channel. Returns a Promise that resolves when unsubscription is confirmed.
     * Can be used with or without await:
     * - Fire-and-forget: channel.unsubscribe()
     * - Wait for confirmation: await channel.unsubscribe()
     */
    unsubscribe(callback?: (message: Message) => void, options?: SubscribeOptions & {
        timeout?: number;
    }): Promise<void>;
    /**
     * Internal method that synchronously executes the unsubscribe operation.
     * This is called either immediately or after processing the queue.
     */
    private executeUnsubscribe;
    isSubscribed(): boolean;
    isPendingSubscribe(): boolean;
    setPendingSubscribe(pending: boolean): void;
    pause(options?: {
        bufferMessages?: boolean;
    }): void;
    resume(): void;
    isPaused(): boolean;
    hasCallback(): boolean;
    clearBufferedMessages(): void;
    reset(): void;
}
//# sourceMappingURL=socket-channel.d.ts.map
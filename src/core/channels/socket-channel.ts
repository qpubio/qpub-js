import { ActionType } from "../../types/action.type";
import { BaseChannel } from "./channel";
import { IWebSocketClient, ILogger } from "../../interfaces/services.interface";
import { ChannelEvents } from "../../types/event.type";
import {
    OutgoingChannelMessage,
    DataMessagePayload,
    IncomingDataMessage,
    OutgoingDataMessage,
    Message,
} from "../../interfaces/message.interface";
import {
    PublishOptions,
    SubscribeOptions,
} from "../../interfaces/channel.interface";

// Operation types for the queue
interface SubscribeOperation {
    type: "subscribe";
    callback: (message: Message) => void;
    options?: SubscribeOptions;
}

interface UnsubscribeOperation {
    type: "unsubscribe";
    callback?: (message: Message) => void;
    options?: SubscribeOptions;
}

type QueuedOperation = SubscribeOperation | UnsubscribeOperation;

export class SocketChannel extends BaseChannel {
    private wsClient: IWebSocketClient;
    private logger: ILogger;
    private subscribed: boolean = false;
    private pendingSubscribe: boolean = false;
    private pendingUnsubscribe: boolean = false;
    private operationQueue: QueuedOperation[] = [];
    private paused: boolean = false;
    private pausedMessages: Message[] = [];
    private bufferWhilePaused: boolean = true;
    private messageCallback?: (message: Message) => void;
    private messageHandler: (event: MessageEvent) => void;
    private eventCallbacks: Map<string, Set<(message: Message) => void>> =
        new Map();
    private pendingTimeouts: Set<NodeJS.Timeout> = new Set();

    constructor(name: string, wsClient: IWebSocketClient, logger: ILogger) {
        super(name);
        this.wsClient = wsClient;
        this.logger = logger;
        this.logger.debug(`SocketChannel created for: ${name}`);

        // Create the message handler function ONCE - never recreate it
        this.messageHandler = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.channel === this.name) {
                    this.logger.trace(
                        `Received message for channel ${this.name}:`,
                        message
                    );
                    this.handleMessage(message);
                }
            } catch (error) {
                this.logger.error(
                    `Error parsing message for channel ${this.name}:`,
                    error
                );
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

        this.setupMessageHandler();
    }

    private setupMessageHandler(): void {
        const socket = this.wsClient.getSocket();
        if (!socket) {
            this.logger.warn(
                `Cannot setup message handler - socket not available for channel: ${this.name}`
            );
            return;
        }

        // Remove if already attached (idempotent)
        socket.removeEventListener("message", this.messageHandler);

        // Attach the handler
        socket.addEventListener("message", this.messageHandler);
        this.logger.debug(
            `Message handler setup complete for channel: ${this.name}`
        );
    }

    /**
     * Processes the next operation in the queue if the channel is in a stable state.
     * This is called after receiving SUBSCRIBED or UNSUBSCRIBED acknowledgments.
     */
    private processOperationQueue(): void {
        // Only process queue if we're in a stable state (no pending operations)
        if (this.pendingSubscribe || this.pendingUnsubscribe) {
            this.logger.debug(
                `Channel ${this.name} has pending operations - deferring queue processing`
            );
            return;
        }

        if (this.operationQueue.length === 0) {
            return;
        }

        const operation = this.operationQueue.shift()!;
        this.logger.info(
            `Processing queued ${operation.type} operation for channel: ${this.name} (${this.operationQueue.length} remaining in queue)`
        );

        if (operation.type === "subscribe") {
            this.executeSubscribe(operation.callback, operation.options);
        } else {
            this.executeUnsubscribe(operation.callback, operation.options);
        }
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

        this.logger.trace(
            `Transforming ${messages.length} message(s) for channel ${this.name}`
        );

        return messages.map(
            (messagePayload, index): Message => ({
                // Base message fields
                action,
                error,
                // Container message fields - suffix ID with index for batch messages
                id: messages.length > 1 ? `${id}-${index}` : id,
                timestamp,
                channel,
                // Individual message payload fields
                alias: messagePayload.alias,
                event: messagePayload.event,
                data: messagePayload.data,
            })
        );
    }

    private handleMessage(message: any): void {
        this.logger.debug(
            `Handling message action ${message.action} for channel: ${this.name}`
        );

        switch (message.action) {
            case ActionType.MESSAGE:
                if (this.isSubscribed()) {
                    const incomingDataMessage = message as IncomingDataMessage;
                    const consumerMessages =
                        this.transformToConsumerMessages(incomingDataMessage);

                    if (this.paused) {
                        if (this.bufferWhilePaused) {
                            this.logger.debug(
                                `Channel ${this.name} is paused - buffering ${consumerMessages.length} message(s)`
                            );
                            this.pausedMessages.push(...consumerMessages);
                        } else {
                            this.logger.debug(
                                `Channel ${this.name} is paused - dropping ${consumerMessages.length} message(s)`
                            );
                        }
                    } else {
                        this.logger.debug(
                            `Dispatching ${consumerMessages.length} message(s) to callback for channel: ${this.name}`
                        );
                        // Call the callback for each individual message
                        consumerMessages.forEach((consumerMessage) => {
                            this.messageCallback?.(consumerMessage);
                        });
                    }
                } else {
                    this.logger.warn(
                        `Received message for channel ${this.name} but not subscribed - ignoring`
                    );
                }
                break;

            case ActionType.SUBSCRIBED:
                this.subscribed = true;
                this.pendingSubscribe = false;
                this.logger.info(
                    `Channel ${this.name} subscribed successfully (subscription ID: ${message.subscription_id})`
                );
                this.emit(ChannelEvents.SUBSCRIBED, {
                    channelName: this.name,
                    subscriptionId: message.subscription_id || "",
                });
                // Process any queued operations now that subscribe completed
                this.processOperationQueue();
                break;

            case ActionType.UNSUBSCRIBED:
                this.subscribed = false;
                this.pendingSubscribe = false;
                this.pendingUnsubscribe = false;
                this.messageCallback = undefined;
                this.eventCallbacks.clear();
                this.logger.info(
                    `Channel ${this.name} unsubscribed (subscription ID: ${message.subscription_id})`
                );
                this.emit(ChannelEvents.UNSUBSCRIBED, {
                    channelName: this.name,
                    subscriptionId: message.subscription_id,
                });
                // Process any queued operations now that unsubscribe completed
                this.processOperationQueue();
                break;

            case ActionType.ERROR:
                this.logger.error(
                    `Channel ${this.name} received error:`,
                    message.error
                );
                this.emit(ChannelEvents.FAILED, {
                    channelName: this.name,
                    error: message.error || new Error("Unknown channel error"),
                    action: "channel_operation",
                });
                break;

            default:
                this.logger.warn(
                    `Unknown action type ${message.action} received for channel: ${this.name}`
                );
        }
    }

    /**
     * Publish a message to the channel.
     * Note: This is a fire-and-forget operation - no server acknowledgment is expected.
     * The Promise resolves immediately after sending, not after delivery confirmation.
     */
    public async publish(data: any, options?: PublishOptions): Promise<void> {
        this.logger.debug(
            `Publishing to channel ${this.name}${options?.event ? ` (event: ${options.event})` : ""}${options?.alias ? ` (alias: ${options.alias})` : ""}`
        );

        if (!this.wsClient.isConnected()) {
            const error = new Error(
                "Cannot publish: WebSocket is not connected"
            );
            this.logger.error(
                `Publish failed for channel ${this.name}:`,
                error
            );
            throw error;
        }

        try {
            const messagePayload: DataMessagePayload = {
                data,
                event: options?.event,
                alias: options?.alias,
            };

            const publishMessage: OutgoingDataMessage = {
                action: ActionType.PUBLISH,
                channel: this.name,
                messages: [messagePayload],
            };

            this.logger.trace(
                `Sending publish message for channel ${this.name}:`,
                publishMessage
            );
            this.wsClient.send(JSON.stringify(publishMessage));
            this.logger.info(`Published message to channel: ${this.name}`);
        } catch (error) {
            this.logger.error(
                `Error publishing to channel ${this.name}:`,
                error
            );
            this.emit(ChannelEvents.FAILED, {
                channelName: this.name,
                error:
                    error instanceof Error ? error : new Error("Unknown error"),
                action: "publish",
            });
            throw error;
        }
    }

    /**
     * Subscribe to channel messages. Returns a Promise that resolves when subscription is confirmed.
     * Can be used with or without await:
     * - Fire-and-forget: channel.subscribe(callback)
     * - Wait for confirmation: await channel.subscribe(callback)
     */
    public async subscribe(
        callback: (message: Message) => void,
        options?: SubscribeOptions & { timeout?: number }
    ): Promise<void> {
        const timeout = options?.timeout || 10000; // Default 10s timeout

        this.logger.debug(
            `Subscribe requested for channel: ${this.name} (subscribed: ${this.subscribed}, event: ${options?.event}, pendingSubscribe: ${this.pendingSubscribe}, pendingUnsubscribe: ${this.pendingUnsubscribe})`
        );

        if (!this.wsClient.isConnected()) {
            this.pendingSubscribe = true;
            const error = new Error(
                "Cannot subscribe: WebSocket is not connected"
            );
            this.logger.error(
                `Subscribe failed for channel ${this.name}:`,
                error
            );
            throw error;
        }

        // Determine if we need to wait for network confirmation
        let needsNetworkConfirmation = false;
        let willQueue = false;

        // Special handling for event-specific subscriptions:
        // They can proceed if the channel is already subscribed or subscribing
        // (unless an unsubscribe is pending)
        // because they just add to the event callbacks map
        if (options?.event) {
            // If unsubscribe is pending, we must queue
            if (this.pendingUnsubscribe) {
                this.logger.info(
                    `Queueing event subscribe operation for channel ${this.name} (pendingUnsubscribe: ${this.pendingUnsubscribe})`
                );
                this.operationQueue.push({
                    type: "subscribe",
                    callback,
                    options,
                });
                willQueue = true;
                needsNetworkConfirmation = true;
            }
            // Channel is already subscribed or subscribing, just add the event callback
            else if (this.isSubscribed() || this.pendingSubscribe) {
                this.executeSubscribe(callback, options);
                return Promise.resolve();
            } else {
                // Need to subscribe to channel
                needsNetworkConfirmation = true;
            }
        } else {
            // Catch-all subscription - must wait for any pending operations
            if (this.pendingUnsubscribe || this.pendingSubscribe) {
                this.logger.info(
                    `Queueing subscribe operation for channel ${this.name} (pendingUnsubscribe: ${this.pendingUnsubscribe}, pendingSubscribe: ${this.pendingSubscribe})`
                );
                this.operationQueue.push({
                    type: "subscribe",
                    callback,
                    options,
                });
                willQueue = true;
                needsNetworkConfirmation = true;
            } else if (this.isSubscribed()) {
                // Just updating callback, no network call
                this.executeSubscribe(callback, options);
                return Promise.resolve();
            } else {
                // Need to subscribe to channel
                needsNetworkConfirmation = true;
            }
        }

        if (!needsNetworkConfirmation) {
            // Can execute immediately without waiting
            this.executeSubscribe(callback, options);
            return Promise.resolve();
        }

        // Need to wait for network confirmation
        return new Promise<void>((resolve, reject) => {
            const handleSubscribed = () => {
                cleanup();
                this.logger.debug(
                    `Subscribe resolved for channel: ${this.name}`
                );
                resolve();
            };

            const handleFailed = (event: any) => {
                cleanup();
                this.logger.error(
                    `Subscribe rejected for channel: ${this.name}`,
                    event.error
                );
                reject(event.error);
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                const error = new Error(
                    `Subscription timeout after ${timeout}ms for channel: ${this.name}`
                );
                this.logger.error(error.message);
                reject(error);
            }, timeout);

            // Track the timeout so it can be cleaned up
            this.pendingTimeouts.add(timeoutId);

            const cleanup = () => {
                clearTimeout(timeoutId);
                this.pendingTimeouts.delete(timeoutId);
                this.off(ChannelEvents.SUBSCRIBED, handleSubscribed);
                this.off(ChannelEvents.FAILED, handleFailed);
            };

            this.once(ChannelEvents.SUBSCRIBED, handleSubscribed);
            this.once(ChannelEvents.FAILED, handleFailed);

            try {
                // If not queued, execute immediately
                if (!willQueue) {
                    this.executeSubscribe(callback, options);
                }
                // If queued, the operation will execute when processOperationQueue is called
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
    }

    /**
     * Internal method that synchronously executes the subscribe operation.
     * This is called either immediately or after processing the queue.
     */
    private executeSubscribe(
        callback: (message: Message) => void,
        options?: SubscribeOptions
    ): void {
        this.logger.debug(
            `Executing subscribe for channel: ${this.name} (subscribed: ${this.subscribed}, event: ${options?.event})`
        );

        // Handle event-specific subscription
        if (options?.event) {
            // Get or create the set of callbacks for this event
            let callbacks = this.eventCallbacks.get(options.event);
            if (!callbacks) {
                callbacks = new Set();
                this.eventCallbacks.set(options.event, callbacks);
            }

            // Add the callback
            callbacks.add(callback);

            this.logger.info(
                `Subscribed to event "${options.event}" on channel: ${this.name} (total callbacks for this event: ${callbacks.size})`
            );

            // If not already subscribed to channel, subscribe with master callback
            if (!this.isSubscribed() && !this.pendingSubscribe) {
                this.setupMessageHandler();
                this.logger.info(
                    `Subscribing to channel: ${this.name} (event-driven mode)`
                );
                this.emit(ChannelEvents.SUBSCRIBING, {
                    channelName: this.name,
                });

                // Master callback distributes to event-specific callbacks
                this.messageCallback = (message: Message) => {
                    if (message.event) {
                        const eventCallbacks = this.eventCallbacks.get(
                            message.event
                        );
                        if (eventCallbacks) {
                            eventCallbacks.forEach((cb) => cb(message));
                        }
                    }
                };
                this.pendingSubscribe = true;

                const actionMessage: OutgoingChannelMessage = {
                    action: ActionType.SUBSCRIBE,
                    channel: this.name,
                };
                this.logger.trace(
                    `Sending subscribe message for channel ${this.name}:`,
                    actionMessage
                );
                this.wsClient.send(JSON.stringify(actionMessage));
            }
            return;
        }

        // Handle catch-all subscription (no specific event)
        if (this.isSubscribed() && !this.pendingSubscribe) {
            // Channel is already subscribed, just update the callback
            this.logger.info(
                `Channel ${this.name} already subscribed - updating to catch-all callback`
            );
            this.messageCallback = callback;
            // Clear event-specific callbacks when switching to catch-all
            this.eventCallbacks.clear();
            return;
        }

        // Ensure handler is attached to WebSocket (idempotent operation)
        this.setupMessageHandler();

        this.logger.info(
            `Subscribing to channel: ${this.name} (catch-all mode)`
        );
        this.emit(ChannelEvents.SUBSCRIBING, {
            channelName: this.name,
        });
        this.messageCallback = callback;
        // Clear event-specific callbacks when using catch-all
        this.eventCallbacks.clear();
        this.pendingSubscribe = true;

        const actionMessage: OutgoingChannelMessage = {
            action: ActionType.SUBSCRIBE,
            channel: this.name,
        };
        this.logger.trace(
            `Sending subscribe message for channel ${this.name}:`,
            actionMessage
        );
        this.wsClient.send(JSON.stringify(actionMessage));
    }

    public async resubscribe(): Promise<void> {
        this.logger.debug(
            `Resubscribe requested for channel ${this.name} (has callback: ${!!this.messageCallback}, event callbacks: ${this.eventCallbacks.size})`
        );

        // Only resubscribe if we have a callback or event callbacks
        if (!this.messageCallback && this.eventCallbacks.size === 0) {
            this.logger.debug(
                `Skipping resubscribe for channel ${this.name} - no callbacks registered`
            );
            return;
        }

        try {
            this.logger.info(`Resubscribing to channel: ${this.name}`);
            // Store the current callbacks before resubscribing
            const existingCallback = this.messageCallback;
            const existingEventCallbacks = new Map(this.eventCallbacks);

            // Clear subscription state before resubscribing (important for reconnection scenarios)
            // This ensures executeSubscribe will send a new SUBSCRIBE message
            this.subscribed = false;
            this.pendingSubscribe = false;
            this.pendingUnsubscribe = false;

            // If we have event-specific callbacks, resubscribe to each and wait for confirmation
            if (existingEventCallbacks.size > 0) {
                Array.from(existingEventCallbacks.entries()).forEach(
                    ([event, callbacks]) => {
                        Array.from(callbacks).forEach((callback) => {
                            // Use executeSubscribe directly to bypass queueing
                            this.executeSubscribe(callback, { event });
                        });
                    }
                );
                // Wait for the subscription to be confirmed (only one SUBSCRIBED event will fire)
                await new Promise<void>((resolve, reject) => {
                    const handleSubscribed = () => {
                        this.off(ChannelEvents.SUBSCRIBED, handleSubscribed);
                        this.off(ChannelEvents.FAILED, handleFailed);
                        resolve();
                    };
                    const handleFailed = (event: any) => {
                        this.off(ChannelEvents.SUBSCRIBED, handleSubscribed);
                        this.off(ChannelEvents.FAILED, handleFailed);
                        reject(event.error);
                    };
                    this.once(ChannelEvents.SUBSCRIBED, handleSubscribed);
                    this.once(ChannelEvents.FAILED, handleFailed);
                });
            } else if (existingCallback) {
                // Otherwise, resubscribe with the catch-all callback and wait
                this.executeSubscribe(existingCallback);
                // Wait for subscription confirmation
                await new Promise<void>((resolve, reject) => {
                    const handleSubscribed = () => {
                        this.off(ChannelEvents.SUBSCRIBED, handleSubscribed);
                        this.off(ChannelEvents.FAILED, handleFailed);
                        resolve();
                    };
                    const handleFailed = (event: any) => {
                        this.off(ChannelEvents.SUBSCRIBED, handleSubscribed);
                        this.off(ChannelEvents.FAILED, handleFailed);
                        reject(event.error);
                    };
                    this.once(ChannelEvents.SUBSCRIBED, handleSubscribed);
                    this.once(ChannelEvents.FAILED, handleFailed);
                });
            }
        } catch (error) {
            this.logger.error(
                `Resubscribe failed for channel ${this.name}:`,
                error
            );
            this.emit(ChannelEvents.FAILED, {
                channelName: this.name,
                error:
                    error instanceof Error ? error : new Error("Unknown error"),
                action: "resubscribe",
            });
            throw error;
        }
    }

    /**
     * Unsubscribe from channel. Returns a Promise that resolves when unsubscription is confirmed.
     * Can be used with or without await:
     * - Fire-and-forget: channel.unsubscribe()
     * - Wait for confirmation: await channel.unsubscribe()
     */
    public async unsubscribe(
        callback?: (message: Message) => void,
        options?: SubscribeOptions & { timeout?: number }
    ): Promise<void> {
        const timeout = options?.timeout || 10000; // Default 10s timeout

        this.logger.debug(
            `Unsubscribe requested for channel: ${this.name} (subscribed: ${this.subscribed}, event: ${options?.event}, pendingSubscribe: ${this.pendingSubscribe}, pendingUnsubscribe: ${this.pendingUnsubscribe})`
        );

        // Determine if we need to wait for network confirmation
        let needsNetworkConfirmation = false;
        let willQueue = false;

        // Special handling for event-specific unsubscriptions:
        // They can proceed if the channel is subscribed because they just
        // remove from the event callbacks map
        if (options?.event) {
            if (this.isSubscribed() && !this.pendingUnsubscribe) {
                // Channel is subscribed and stable, can remove event callback immediately
                // Check if this will trigger full unsubscribe
                const callbacks = this.eventCallbacks.get(options.event);
                if (callbacks) {
                    const willBeEmpty = callback
                        ? callbacks.size === 1 && callbacks.has(callback)
                        : true;
                    const isLastEvent = this.eventCallbacks.size === 1;
                    needsNetworkConfirmation = willBeEmpty && isLastEvent;
                }

                if (!needsNetworkConfirmation) {
                    this.executeUnsubscribe(callback, options);
                    return Promise.resolve();
                }
            } else {
                // Otherwise queue it
                if (this.pendingSubscribe || this.pendingUnsubscribe) {
                    this.logger.info(
                        `Queueing event unsubscribe operation for channel ${this.name} (pendingSubscribe: ${this.pendingSubscribe}, pendingUnsubscribe: ${this.pendingUnsubscribe})`
                    );
                    this.operationQueue.push({
                        type: "unsubscribe",
                        callback,
                        options,
                    });
                    willQueue = true;
                    needsNetworkConfirmation = true;
                } else {
                    needsNetworkConfirmation = true;
                }
            }
        } else {
            // Full channel unsubscribe
            if (!this.isSubscribed() && !this.pendingSubscribe) {
                // Not subscribed, resolve immediately
                return Promise.resolve();
            }

            if (this.pendingSubscribe || this.pendingUnsubscribe) {
                this.logger.info(
                    `Queueing unsubscribe operation for channel ${this.name} (pendingSubscribe: ${this.pendingSubscribe}, pendingUnsubscribe: ${this.pendingUnsubscribe})`
                );
                this.operationQueue.push({
                    type: "unsubscribe",
                    callback,
                    options,
                });
                willQueue = true;
                needsNetworkConfirmation = true;
            } else {
                needsNetworkConfirmation = true;
            }
        }

        if (!needsNetworkConfirmation) {
            this.executeUnsubscribe(callback, options);
            return Promise.resolve();
        }

        // Need to wait for network confirmation
        return new Promise<void>((resolve, reject) => {
            const handleUnsubscribed = () => {
                cleanup();
                this.logger.debug(
                    `Unsubscribe resolved for channel: ${this.name}`
                );
                resolve();
            };

            const handleFailed = (event: any) => {
                cleanup();
                this.logger.error(
                    `Unsubscribe rejected for channel: ${this.name}`,
                    event.error
                );
                reject(event.error);
            };

            const timeoutId = setTimeout(() => {
                cleanup();
                const error = new Error(
                    `Unsubscription timeout after ${timeout}ms for channel: ${this.name}`
                );
                this.logger.error(error.message);
                reject(error);
            }, timeout);

            // Track the timeout so it can be cleaned up
            this.pendingTimeouts.add(timeoutId);

            const cleanup = () => {
                clearTimeout(timeoutId);
                this.pendingTimeouts.delete(timeoutId);
                this.off(ChannelEvents.UNSUBSCRIBED, handleUnsubscribed);
                this.off(ChannelEvents.FAILED, handleFailed);
            };

            this.once(ChannelEvents.UNSUBSCRIBED, handleUnsubscribed);
            this.once(ChannelEvents.FAILED, handleFailed);

            try {
                // If not queued, execute immediately
                if (!willQueue) {
                    this.executeUnsubscribe(callback, options);
                }
                // If queued, the operation will execute when processOperationQueue is called
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
    }

    /**
     * Internal method that synchronously executes the unsubscribe operation.
     * This is called either immediately or after processing the queue.
     */
    private executeUnsubscribe(
        callback?: (message: Message) => void,
        options?: SubscribeOptions
    ): void {
        // Handle event-specific unsubscribe
        if (options?.event) {
            this.logger.debug(
                `Event-specific unsubscribe requested for event "${options.event}" on channel: ${this.name}`
            );

            const callbacks = this.eventCallbacks.get(options.event);
            if (!callbacks) {
                this.logger.debug(
                    `No callbacks found for event "${options.event}" on channel: ${this.name}`
                );
                return;
            }

            if (callback) {
                // Remove specific callback from specific event
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.eventCallbacks.delete(options.event);
                }
                this.logger.info(
                    `Unsubscribed callback from event "${options.event}" on channel: ${this.name} (remaining callbacks: ${callbacks.size})`
                );
            } else {
                // Remove all callbacks for this event
                this.eventCallbacks.delete(options.event);
                this.logger.info(
                    `Unsubscribed all callbacks from event "${options.event}" on channel: ${this.name}`
                );
            }

            // If no more event callbacks, fully unsubscribe from channel
            if (this.eventCallbacks.size === 0 && this.isSubscribed()) {
                this.logger.info(
                    `No more event callbacks - fully unsubscribing from channel: ${this.name}`
                );
                // Continue to full unsubscribe logic below
            } else {
                return; // Still have event callbacks, don't unsubscribe from channel
            }
        }

        // Handle full unsubscribe from channel
        this.logger.debug(
            `Full unsubscribe requested for channel ${this.name} (subscribed: ${this.subscribed})`
        );

        if (!this.isSubscribed()) {
            this.logger.debug(
                `Channel ${this.name} not subscribed - skipping unsubscribe`
            );
            return;
        }

        // If WebSocket is not connected, don't send unsubscribe but keep callback for auto-resubscribe
        if (!this.wsClient.isConnected()) {
            this.logger.debug(
                `WebSocket not connected - clearing subscription flag but keeping callback for auto-resubscribe`
            );
            this.subscribed = false;
            // Don't clear messageCallback - preserve it for auto-resubscribe on reconnection
            this.emit(ChannelEvents.UNSUBSCRIBED, {
                channelName: this.name,
            });
            return;
        }

        this.logger.info(`Unsubscribing from channel: ${this.name}`);
        this.emit(ChannelEvents.UNSUBSCRIBING, {
            channelName: this.name,
        });
        this.pendingUnsubscribe = true;

        const actionMessage: OutgoingChannelMessage = {
            action: ActionType.UNSUBSCRIBE,
            channel: this.name,
        };
        this.logger.trace(
            `Sending unsubscribe message for channel ${this.name}:`,
            actionMessage
        );
        this.wsClient.send(JSON.stringify(actionMessage));
    }

    public isSubscribed(): boolean {
        return this.subscribed;
    }

    public isPendingSubscribe(): boolean {
        return this.pendingSubscribe;
    }

    public setPendingSubscribe(pending: boolean): void {
        this.logger.debug(
            `Setting pendingSubscribe to ${pending} for channel: ${this.name}`
        );
        this.pendingSubscribe = pending;
    }

    public pause(options?: { bufferMessages?: boolean }): void {
        if (this.paused) {
            this.logger.debug(
                `Channel ${this.name} is already paused - ignoring pause request`
            );
            return;
        }

        this.paused = true;

        // Update buffer setting if provided
        if (options?.bufferMessages !== undefined) {
            this.bufferWhilePaused = options.bufferMessages;
        }

        this.logger.info(
            `Channel ${this.name} paused (buffering: ${this.bufferWhilePaused})`
        );
        this.emit(ChannelEvents.PAUSED, {
            channelName: this.name,
            buffering: this.bufferWhilePaused,
        });
    }

    public resume(): void {
        if (!this.paused) {
            this.logger.debug(
                `Channel ${this.name} is not paused - ignoring resume request`
            );
            return;
        }

        this.paused = false;

        // Deliver buffered messages if any
        const bufferedCount = this.pausedMessages.length;
        if (bufferedCount > 0) {
            this.logger.info(
                `Channel ${this.name} resumed - delivering ${bufferedCount} buffered message(s)`
            );
            this.pausedMessages.forEach((message) => {
                this.messageCallback?.(message);
            });
            this.pausedMessages = [];
        } else {
            this.logger.info(`Channel ${this.name} resumed`);
        }

        this.emit(ChannelEvents.RESUMED, {
            channelName: this.name,
            bufferedMessagesDelivered: bufferedCount,
        });
    }

    public isPaused(): boolean {
        return this.paused;
    }

    public hasCallback(): boolean {
        return !!this.messageCallback;
    }

    public clearBufferedMessages(): void {
        const count = this.pausedMessages.length;
        if (count > 0) {
            this.logger.info(
                `Clearing ${count} buffered message(s) for channel: ${this.name}`
            );
            this.pausedMessages = [];
        }
    }

    public reset(): void {
        this.logger.info(`Resetting channel: ${this.name}`);

        // Remove the handler from the WebSocket, but don't destroy the function
        const socket = this.wsClient.getSocket();
        if (socket) {
            this.logger.debug(
                `Removing message handler for channel: ${this.name}`
            );
            socket.removeEventListener("message", this.messageHandler);
        }

        // Only attempt to unsubscribe if WebSocket is still connected
        // If disconnected, the server will handle cleanup automatically
        if (this.isSubscribed() && this.wsClient.isConnected()) {
            try {
                this.logger.debug(
                    `Unsubscribing channel ${this.name} during reset`
                );
                this.unsubscribe();
            } catch (error) {
                // Log error but don't throw to prevent blocking reset
                this.logger.warn(
                    `Failed to unsubscribe from channel ${this.name} during reset:`,
                    error
                );
            }
        }

        // Reset local state regardless of unsubscribe success
        this.logger.debug(`Clearing local state for channel: ${this.name}`);

        // Clear all pending timeouts to prevent memory leaks and hanging promises
        this.pendingTimeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this.pendingTimeouts.clear();

        this.subscribed = false;
        this.messageCallback = undefined;
        this.eventCallbacks.clear();
        this.pendingSubscribe = false;
        this.pendingUnsubscribe = false;
        this.operationQueue = [];
        this.paused = false;
        this.pausedMessages = [];
        this.removeAllListeners();
        this.logger.info(`Channel ${this.name} reset complete`);
    }
}

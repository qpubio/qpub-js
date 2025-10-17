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

export class SocketChannel extends BaseChannel {
    private wsClient: IWebSocketClient;
    private logger: ILogger;
    private subscribed: boolean = false;
    private pendingSubscribe: boolean = false;
    private paused: boolean = false;
    private pausedMessages: Message[] = [];
    private bufferWhilePaused: boolean = true;
    private messageCallback?: (message: Message) => void;
    private messageHandler: (event: MessageEvent) => void;
    private eventCallbacks: Map<string, Set<(message: Message) => void>> =
        new Map();

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
                break;

            case ActionType.UNSUBSCRIBED:
                this.subscribed = false;
                this.pendingSubscribe = false;
                this.messageCallback = undefined;
                this.eventCallbacks.clear();
                this.logger.info(
                    `Channel ${this.name} unsubscribed (subscription ID: ${message.subscription_id})`
                );
                this.emit(ChannelEvents.UNSUBSCRIBED, {
                    channelName: this.name,
                    subscriptionId: message.subscription_id,
                });
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

    public subscribe(
        callback: (message: Message) => void,
        options?: SubscribeOptions
    ): void {
        this.logger.debug(
            `Subscribe requested for channel: ${this.name} (subscribed: ${this.subscribed}, event: ${options?.event}, pending: ${this.pendingSubscribe})`
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
                this.pendingSubscribe = false;

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
        this.pendingSubscribe = false;

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

            // If we have event-specific callbacks, resubscribe to each
            if (existingEventCallbacks.size > 0) {
                Array.from(existingEventCallbacks.entries()).forEach(
                    ([event, callbacks]) => {
                        Array.from(callbacks).forEach((callback) => {
                            this.subscribe(callback, { event });
                        });
                    }
                );
            } else if (existingCallback) {
                // Otherwise, resubscribe with the catch-all callback
                this.subscribe(existingCallback);
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

    public unsubscribe(
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
        this.subscribed = false;
        this.messageCallback = undefined;
        this.eventCallbacks.clear();
        this.pendingSubscribe = false;
        this.paused = false;
        this.pausedMessages = [];
        this.removeAllListeners();
        this.logger.info(`Channel ${this.name} reset complete`);
    }
}

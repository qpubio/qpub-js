import { ChannelManager } from "../../types/services/channel";
import { SocketChannel } from "../channels/socket-channel";
import { RestChannel } from "../channels/rest-channel";
import {
    IWebSocketClient,
    ILogger,
    IHttpClient,
} from "../../types/services/clients";
import {
    ISocketChannelManager,
    IAuthManager,
    IOptionManager,
} from "../../types/services/managers";
import {
    DataMessagePayload,
    RestPublishRequest,
} from "../../types/protocol/messages";

export class SocketChannelManager
    implements ChannelManager, ISocketChannelManager
{
    private channels: Map<string, SocketChannel> = new Map();
    private channelRefCounts: Map<string, number> = new Map();
    private wsClient: IWebSocketClient;
    private logger: ILogger;

    constructor(wsClient: IWebSocketClient, logger: ILogger) {
        this.wsClient = wsClient;
        this.logger = logger;
    }

    public get(channelName: string): SocketChannel {
        const isNewChannel = !this.channels.has(channelName);

        if (isNewChannel) {
            this.logger.debug(`Creating new socket channel: ${channelName}`);
            this.channels.set(
                channelName,
                new SocketChannel(channelName, this.wsClient, this.logger)
            );
        }

        // Increment reference count
        const currentCount = this.channelRefCounts.get(channelName) || 0;
        this.channelRefCounts.set(channelName, currentCount + 1);

        if (!isNewChannel && currentCount === 0) {
            // Channel existed with ref count 0 (was kept for auto-resubscribe)
            this.logger.debug(
                `Channel ${channelName} re-acquired (was kept for auto-resubscribe, ref count: 1)`
            );
        } else {
            this.logger.debug(
                `Channel ${channelName} reference count: ${currentCount + 1}`
            );
        }

        return this.channels.get(channelName)!;
    }

    /**
     * Release a reference to a channel. When the reference count reaches 0:
     * - If the channel has a callback (was subscribed), keep it for auto-resubscribe
     * - If the channel has no callback (was never subscribed), remove it completely
     *
     * @param channelName - The name of the channel to release
     */
    public release(channelName: string): void {
        const count = this.channelRefCounts.get(channelName);

        if (count === undefined || count < 0) {
            this.logger.warn(
                `Attempted to release channel ${channelName} with no active references`
            );
            return;
        }

        if (count === 0) {
            // Channel exists with ref count 0 (kept for auto-resubscribe)
            // This shouldn't happen in normal use, but handle it gracefully
            this.logger.debug(
                `Attempted to release channel ${channelName} that has ref count 0 (kept for auto-resubscribe)`
            );
            return;
        }

        if (count === 1) {
            // Last reference - check if we should keep the channel for auto-resubscribe
            const channel = this.channels.get(channelName);

            if (channel && channel.hasCallback()) {
                // Channel was subscribed - keep it in manager for auto-resubscribe
                // Just decrement ref count to 0, don't remove
                this.channelRefCounts.set(channelName, 0);
                this.logger.debug(
                    `Last reference to channel ${channelName} released - keeping for auto-resubscribe (ref count: 0)`
                );
            } else {
                // Channel was never subscribed - clean up completely
                this.logger.debug(
                    `Last reference to channel ${channelName} released - cleaning up`
                );
                if (channel) {
                    // Call reset() which properly cleans up WebSocket handlers
                    try {
                        channel.reset();
                    } catch (error) {
                        this.logger.warn(
                            `Failed to reset channel ${channelName} during cleanup:`,
                            error
                        );
                    }
                    // Remove the channel from the manager
                    this.channels.delete(channelName);
                    this.logger.debug(
                        `Channel ${channelName} removed from manager`
                    );
                }
                this.channelRefCounts.delete(channelName);
            }
        } else {
            // Still have other references
            this.channelRefCounts.set(channelName, count - 1);
            this.logger.debug(
                `Channel ${channelName} reference count: ${count - 1}`
            );
        }
    }

    public getAllChannels(): SocketChannel[] {
        return Array.from(this.channels.values());
    }

    public has(channelName: string): boolean {
        return this.channels.has(channelName);
    }

    public remove(channelName: string): void {
        const channel = this.channels.get(channelName);
        if (channel) {
            // Clean up the channel before removing
            channel.removeAllListeners();
            this.channels.delete(channelName);
            this.logger.debug(`Channel ${channelName} removed`);
        }
    }

    public pendingSubscribeAllChannels(): void {
        const channels = this.getAllChannels();
        for (const channel of channels) {
            channel.setPendingSubscribe(true);
        }
    }

    public async resubscribeAllChannels(): Promise<void> {
        const allChannels = this.getAllChannels();
        // Only attempt to resubscribe channels that have a callback (were previously subscribed)
        const channelsToResubscribe = allChannels.filter((channel) =>
            channel.hasCallback()
        );

        if (channelsToResubscribe.length === 0) {
            this.logger.debug(
                `No channels with active subscriptions to resubscribe`
            );
            return;
        }

        this.logger.debug(
            `Resubscribing to ${channelsToResubscribe.length} channel(s)`
        );

        for (const channel of channelsToResubscribe) {
            try {
                await channel.resubscribe();
                this.logger.debug(
                    `Resubscribed to channel: ${channel.getName()}`
                );
            } catch (error) {
                this.logger.error(
                    `Failed to resubscribe to channel ${channel.getName()}:`,
                    error
                );
            }
        }
    }

    public reset(): void {
        this.logger.debug("Resetting all socket channels");
        // Reset all channels
        this.channels.forEach((channel) => channel.reset());
        this.channels.clear();
        this.channelRefCounts.clear();
    }
}

export class RestChannelManager implements ChannelManager {
    private channels: Map<string, RestChannel> = new Map();
    private httpClient: IHttpClient;
    private authManager: IAuthManager;
    private optionManager: IOptionManager;
    private logger: ILogger;

    constructor(
        httpClient: IHttpClient,
        authManager: IAuthManager,
        optionManager: IOptionManager,
        logger: ILogger
    ) {
        this.httpClient = httpClient;
        this.authManager = authManager;
        this.optionManager = optionManager;
        this.logger = logger;
    }

    public get(channelName: string): RestChannel {
        if (!this.channels.has(channelName)) {
            this.logger.debug(`Creating new REST channel: ${channelName}`);
            this.channels.set(
                channelName,
                new RestChannel(
                    channelName,
                    this.httpClient,
                    this.authManager,
                    this.optionManager,
                    this.logger
                )
            );
        }

        return this.channels.get(channelName)!;
    }

    public async publishBatch<T = any>(
        channels: string[],
        messages: DataMessagePayload[]
    ): Promise<T> {
        const headers = this.authManager.getAuthHeaders();
        const host = this.optionManager.getOption("httpHost");
        const port = this.optionManager.getOption("httpPort");
        const isSecure = this.optionManager.getOption("isSecure");
        const protocol = isSecure ? "https" : "http";
        const url = `${protocol}://${host}${
            port ? `:${port}` : ""
        }/v1/channels/messages`;

        const requestPayload: RestPublishRequest = {
            channels,
            messages,
        };

        this.logger.debug(`Publishing batch to ${url}`);
        this.logger.debug(`Request payload: ${JSON.stringify(requestPayload)}`);
        this.logger.debug(`Headers: ${JSON.stringify(headers)}`);

        return await this.httpClient.post<T>(url, requestPayload, headers);
    }

    public has(channelName: string): boolean {
        return this.channels.has(channelName);
    }

    public remove(channelName: string): void {
        const channel = this.channels.get(channelName);
        if (channel) {
            // Clean up the channel before removing
            channel.removeAllListeners();
            this.channels.delete(channelName);
            this.logger.debug(`REST channel ${channelName} removed`);
        }
    }

    public reset(): void {
        this.logger.debug("Resetting all REST channels");
        // Reset all channels
        this.channels.forEach((channel) => channel.reset());
        this.channels.clear();
    }
}

import { ChannelManager } from "../../interfaces/channel.interface";
import { SocketChannel } from "../channels/socket-channel";
import { RestChannel } from "../channels/rest-channel";
import {
    IWebSocketClient,
    ILogger,
    ISocketChannelManager,
    IHttpClient,
    IAuthManager,
    IOptionManager,
} from "../../interfaces/services.interface";
import {
    DataMessagePayload,
    RestPublishRequest,
} from "../../interfaces/message.interface";

export class SocketChannelManager implements ChannelManager, ISocketChannelManager {
    private channels: Map<string, SocketChannel> = new Map();
    private wsClient: IWebSocketClient;
    private logger: ILogger;

    constructor(wsClient: IWebSocketClient, logger: ILogger) {
        this.wsClient = wsClient;
        this.logger = logger;
    }



    public get(channelName: string): SocketChannel {
        if (!this.channels.has(channelName)) {
            this.logger.debug(`Creating new socket channel: ${channelName}`);
            this.channels.set(
                channelName,
                new SocketChannel(channelName, this.wsClient)
            );
        }

        return this.channels.get(channelName)!;
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
        const channels = this.getAllChannels();

        this.logger.debug(`Resubscribing to ${channels.length} channels`);

        for (const channel of channels) {
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
                    this.optionManager
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

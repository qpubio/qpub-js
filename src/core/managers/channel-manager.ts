import { ChannelManager } from "../../interfaces/channel.interface";
import { SocketChannel } from "../channels/socket-channel";
import { WebSocketClient } from "../connections/websocket-client";
import { RestChannel } from "../channels/rest-channel";
import { HttpClient } from "../transport/http-client";
import { AuthManager } from "./auth-manager";
import { OptionManager } from "./option-manager";
import { Logger } from "../shared/logger";
import {
    DataMessagePayload,
    RestPublishRequest,
} from "../../interfaces/message.interface";

export class SocketChannelManager implements ChannelManager {
    private static instances: Map<string, SocketChannelManager> = new Map();
    private instanceId: string;
    private channels: Map<string, SocketChannel> = new Map();
    private wsClient: WebSocketClient;
    private logger: Logger;

    constructor(instanceId: string) {
        this.instanceId = instanceId;
        this.wsClient = WebSocketClient.getInstance(this.instanceId);
        this.logger = new Logger(instanceId, "SocketChannelManager");
    }

    public static getInstance(instanceId: string): SocketChannelManager {
        if (!SocketChannelManager.instances.has(instanceId)) {
            SocketChannelManager.instances.set(
                instanceId,
                new SocketChannelManager(instanceId)
            );
        }
        return SocketChannelManager.instances.get(instanceId)!;
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

        // Remove this instance from static map
        SocketChannelManager.instances.delete(this.instanceId);
    }
}

export class RestChannelManager implements ChannelManager {
    private static instances: Map<string, RestChannelManager> = new Map();
    private instanceId: string;
    private channels: Map<string, RestChannel> = new Map();
    private httpClient: HttpClient;
    private authManager: AuthManager;
    private optionManager: OptionManager;
    private logger: Logger;

    constructor(instanceId: string) {
        this.instanceId = instanceId;
        this.httpClient = new HttpClient();
        this.authManager = AuthManager.getInstance(this.instanceId);
        this.optionManager = OptionManager.getInstance(this.instanceId);
        this.logger = new Logger(instanceId, "RestChannelManager");
    }

    public static getInstance(instanceId: string): RestChannelManager {
        if (!RestChannelManager.instances.has(instanceId)) {
            RestChannelManager.instances.set(
                instanceId,
                new RestChannelManager(instanceId)
            );
        }
        return RestChannelManager.instances.get(instanceId)!;
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

    public reset(): void {
        this.logger.debug("Resetting all REST channels");
        // Reset all channels
        this.channels.forEach((channel) => channel.reset());
        this.channels.clear();

        // Remove this instance from static map
        RestChannelManager.instances.delete(this.instanceId);
    }
}

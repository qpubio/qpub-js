import { ChannelManager } from "../../types/services/channel";
import { SocketChannel } from "../channels/socket-channel";
import { RestChannel } from "../channels/rest-channel";
import { IWebSocketClient, ILogger, IHttpClient } from "../../types/services/clients";
import { ISocketChannelManager, IAuthManager, IOptionManager } from "../../types/services/managers";
import { DataMessagePayload } from "../../types/protocol/messages";
export declare class SocketChannelManager implements ChannelManager, ISocketChannelManager {
    private channels;
    private channelRefCounts;
    private wsClient;
    private logger;
    constructor(wsClient: IWebSocketClient, logger: ILogger);
    get(channelName: string): SocketChannel;
    /**
     * Release a reference to a channel. When the reference count reaches 0:
     * - If the channel has a callback (was subscribed), keep it for auto-resubscribe
     * - If the channel has no callback (was never subscribed), remove it completely
     *
     * @param channelName - The name of the channel to release
     */
    release(channelName: string): void;
    getAllChannels(): SocketChannel[];
    has(channelName: string): boolean;
    remove(channelName: string): void;
    pendingSubscribeAllChannels(): void;
    resubscribeAllChannels(): Promise<void>;
    reset(): void;
}
export declare class RestChannelManager implements ChannelManager {
    private channels;
    private httpClient;
    private authManager;
    private optionManager;
    private logger;
    constructor(httpClient: IHttpClient, authManager: IAuthManager, optionManager: IOptionManager, logger: ILogger);
    get(channelName: string): RestChannel;
    publishBatch<T = any>(channels: string[], messages: DataMessagePayload[]): Promise<T>;
    has(channelName: string): boolean;
    remove(channelName: string): void;
    reset(): void;
}
//# sourceMappingURL=channel-manager.d.ts.map
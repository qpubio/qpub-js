import { BaseChannel } from "./channel";
import { IHttpClient, IAuthManager, IOptionManager } from "../../interfaces/services.interface";
import { RestPublishRequest } from "../../interfaces/message.interface";
import { ChannelEvents } from "../../types/event.type";

export class RestChannel extends BaseChannel {
    private httpClient: IHttpClient;
    private authManager: IAuthManager;
    private optionManager: IOptionManager;

    constructor(
        name: string,
        httpClient: IHttpClient,
        authManager: IAuthManager,
        optionManager: IOptionManager
    ) {
        super(name);
        this.httpClient = httpClient;
        this.authManager = authManager;
        this.optionManager = optionManager;
    }

    public async publish<T = any>(
        data: any,
        event?: string,
        clientId?: string
    ): Promise<T> {
        try {
            const headers = this.authManager.getAuthHeaders();
            const host = this.optionManager.getOption("httpHost");
            const port = this.optionManager.getOption("httpPort");
            const isSecure = this.optionManager.getOption("isSecure");
            const protocol = isSecure ? "https" : "http";
            const url = `${protocol}://${host}${
                port ? `:${port}` : ""
            }/v1/channel/${this.name}/messages`;

            const requestPayload: RestPublishRequest = {
                messages: [
                    {
                        clientId,
                        event,
                        data,
                    },
                ],
            };

            return await this.httpClient.post<T>(url, requestPayload, headers);
        } catch (error) {
            this.emit(ChannelEvents.FAILED, { 
                channelName: this.name, 
                error: error instanceof Error ? error : new Error("Unknown error"),
                action: "publish"
            });
            throw error;
        }
    }

    public reset(): void {
        this.removeAllListeners();
    }
}

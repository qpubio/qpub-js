import { BaseChannel } from "./channel";
import {
    IHttpClient,
    ILogger,
} from "../../types/services/clients";
import {
    IAuthManager,
    IOptionManager,
} from "../../types/services/managers";
import { RestPublishRequest } from "../../types/protocol/messages";
import { ChannelEvents } from "../../types/events/constants";
import { PublishOptions } from "../../types/services/channel";

export class RestChannel extends BaseChannel {
    private httpClient: IHttpClient;
    private authManager: IAuthManager;
    private optionManager: IOptionManager;
    private logger: ILogger;

    constructor(
        name: string,
        httpClient: IHttpClient,
        authManager: IAuthManager,
        optionManager: IOptionManager,
        logger: ILogger
    ) {
        super(name);
        this.httpClient = httpClient;
        this.authManager = authManager;
        this.optionManager = optionManager;
        this.logger = logger;
        this.logger.debug(`RestChannel created for: ${name}`);
    }

    public async publish<T = any>(
        data: any,
        options?: PublishOptions
    ): Promise<T> {
        this.logger.debug(
            `Publishing to REST channel ${this.name}${options?.event ? ` (event: ${options.event})` : ""}${options?.alias ? ` (alias: ${options.alias})` : ""}`
        );

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
                        alias: options?.alias,
                        event: options?.event,
                        data,
                    },
                ],
            };

            this.logger.trace(
                `Sending REST publish to ${url} for channel ${this.name}:`,
                requestPayload
            );

            const result = await this.httpClient.post<T>(
                url,
                requestPayload,
                headers
            );

            this.logger.info(`Published message to REST channel: ${this.name}`);

            return result;
        } catch (error) {
            this.logger.error(
                `Error publishing to REST channel ${this.name}:`,
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

    public reset(): void {
        this.logger.info(`Resetting REST channel: ${this.name}`);
        this.removeAllListeners();
        this.logger.debug(`REST channel ${this.name} reset complete`);
    }
}

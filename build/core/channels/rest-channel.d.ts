import { BaseChannel } from "./channel";
import { IHttpClient, ILogger } from "../../types/services/clients";
import { IAuthManager, IOptionManager } from "../../types/services/managers";
import { PublishOptions } from "../../types/services/channel";
export declare class RestChannel extends BaseChannel {
    private httpClient;
    private authManager;
    private optionManager;
    private logger;
    constructor(name: string, httpClient: IHttpClient, authManager: IAuthManager, optionManager: IOptionManager, logger: ILogger);
    publish<T = any>(data: any, options?: PublishOptions): Promise<T>;
    reset(): void;
}
//# sourceMappingURL=rest-channel.d.ts.map
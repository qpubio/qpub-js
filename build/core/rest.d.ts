import { Option } from "../types/config/options";
import { RestChannelManager } from "./managers/channel-manager";
import { IOptionManager, IAuthManager } from "../types/services/managers";
export declare class Rest {
    private instanceId;
    private container;
    readonly optionManager: IOptionManager;
    readonly auth: IAuthManager;
    readonly channels: RestChannelManager;
    private logger;
    constructor(options?: Partial<Option>);
    reset(): void;
    getInstanceId(): string;
}
//# sourceMappingURL=rest.d.ts.map
import { Option } from "../types/config/options";
import { IOptionManager, IAuthManager, ISocketChannelManager } from "../types/services/managers";
import { IConnection } from "../types/services/connection";
export declare class Socket {
    private instanceId;
    private container;
    private abortController;
    readonly optionManager: IOptionManager;
    readonly auth: IAuthManager;
    readonly connection: IConnection;
    readonly channels: ISocketChannelManager;
    private logger;
    constructor(options?: Partial<Option>);
    reset(): void;
    getAbortSignal(): AbortSignal;
    getInstanceId(): string;
}
//# sourceMappingURL=socket.d.ts.map
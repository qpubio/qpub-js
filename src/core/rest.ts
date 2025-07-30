import { Option } from "../interfaces/option.interface";
import { OptionManager } from "./managers/option-manager";
import { uuidv7 } from "../utils/uuid";
import { RestChannelManager } from "./managers/channel-manager";
import { Logger } from "./shared/logger";

export class Rest {
    private instanceId: string;
    public optionManager: OptionManager;
    public channels: RestChannelManager;
    private logger: Logger;

    constructor(options?: Partial<Option>) {
        this.instanceId = `rest_${uuidv7()}`;
        this.optionManager = OptionManager.getInstance(
            this.instanceId,
            options
        );
        this.logger = new Logger(this.instanceId, "REST");

        this.logger.debug("Initializing REST instance");

        this.channels = RestChannelManager.getInstance(this.instanceId);

        this.logger.info("Rest instance created");
    }

    public reset(): void {
        this.logger.info("Resetting REST instance");
        this.channels.reset();
        this.optionManager.reset();
    }
}

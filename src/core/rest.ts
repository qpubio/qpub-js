import { Option } from "../interfaces/option.interface";
import { uuidv7 } from "./shared/uuid";
import { ServiceContainer, bootstrapContainer } from "./shared";
import { RestChannelManager } from "./managers/channel-manager";
import {
    IOptionManager,
    ILogger,
    ILoggerFactory,
} from "../interfaces/services.interface";

export class Rest {
    private instanceId: string;
    private container: ServiceContainer;
    
    // Public API - expose through interfaces for clean contracts
    public readonly optionManager: IOptionManager;
    public readonly channels: RestChannelManager;
    
    private logger: ILogger;

    constructor(options?: Partial<Option>) {
        this.instanceId = `rest_${uuidv7()}`;
        
        // Initialize service container
        this.container = new ServiceContainer(this.instanceId);
        
        // Bootstrap all services
        bootstrapContainer(this.container, "rest", this.instanceId, options);
        
        // Resolve main services
        this.optionManager = this.container.resolve<IOptionManager>("optionManager");
        this.channels = this.container.resolve<RestChannelManager>("restChannelManager");
        
        // Get logger for this component
        const loggerFactory = this.container.resolve<ILoggerFactory>("loggerFactory");
        this.logger = loggerFactory.createLogger("REST");

        this.logger.info("Rest instance created");
    }

    public reset(): void {
        this.logger.info("Resetting REST instance");
        
        // Reset all services in reverse dependency order
        this.channels.reset();
        this.optionManager.reset();
        
        // Clear container instances to ensure fresh state
        this.container.clearInstances();
    }
}

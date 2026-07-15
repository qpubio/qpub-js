import { Option } from "../types/config/options";
import { ServiceContainer, bootstrapContainer } from "./bootstrap";
import { uuidv7 } from "./shared";
import { RestChannelManager } from "./managers/channel-manager";
import { RestQueueManager } from "./managers/queue-manager";
import {
    IOptionManager,
    IAuthManager,
    IRestQueueManager,
} from "../types/services/managers";
import {
    ILogger,
    ILoggerFactory,
} from "../types/services/clients";

export class Rest {
    private instanceId: string;
    private container: ServiceContainer;
    
    // Public API - expose through interfaces for clean contracts
    public readonly optionManager: IOptionManager;
    public readonly auth: IAuthManager;
    public readonly channels: RestChannelManager;
    public readonly queues: IRestQueueManager;
    
    private logger: ILogger;

    constructor(options?: Partial<Option>) {
        this.instanceId = `rest_${uuidv7()}`;
        
        // Initialize service container
        this.container = new ServiceContainer(this.instanceId);
        
        // Bootstrap all services
        bootstrapContainer(this.container, "rest", this.instanceId, options);
        
        // Resolve main services
        this.optionManager = this.container.resolve<IOptionManager>("optionManager");
        this.auth = this.container.resolve<IAuthManager>("authManager");
        this.channels = this.container.resolve<RestChannelManager>("restChannelManager");
        this.queues = this.container.resolve<RestQueueManager>("restQueueManager");
        
        // Get logger for this component
        const loggerFactory = this.container.resolve<ILoggerFactory>("loggerFactory");
        this.logger = loggerFactory.createLogger("REST");

        this.logger.info("Rest instance created");
    }

    public reset(): void {
        this.logger.info("Resetting REST instance");
        
        // Reset all services in reverse dependency order
        this.channels.reset();
        this.queues.reset();
        this.optionManager.reset();
        
        // Clear container instances to ensure fresh state
        this.container.clearInstances();
    }

    // Getter for instance ID
    public getInstanceId(): string {
        return this.instanceId;
    }
}

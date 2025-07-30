import { Option } from "../interfaces/option.interface";
import { ServiceContainer, bootstrapContainer } from "./bootstrap";
import { uuidv7 } from "./shared";
import {
    IOptionManager,
    IAuthManager,
    IConnection,
    ISocketChannelManager,
    ILogger,
    ILoggerFactory,
} from "../interfaces/services.interface";

export class Socket {
    private instanceId: string;
    private container: ServiceContainer;
    
    // Public API - expose through interfaces for clean contracts
    public readonly optionManager: IOptionManager;
    public readonly authManager: IAuthManager;
    public readonly connection: IConnection;
    public readonly channels: ISocketChannelManager;
    
    private logger: ILogger;

    constructor(options?: Partial<Option>) {
        this.instanceId = `socket_${uuidv7()}`;
        
        // Initialize service container
        this.container = new ServiceContainer(this.instanceId);
        
        // Bootstrap all services
        bootstrapContainer(this.container, "socket", this.instanceId, options);
        
        // Resolve main services
        this.optionManager = this.container.resolve<IOptionManager>("optionManager");
        this.authManager = this.container.resolve<IAuthManager>("authManager");
        this.connection = this.container.resolve<IConnection>("connection");
        this.channels = this.container.resolve<ISocketChannelManager>("socketChannelManager");
        
        // Get logger for this component
        const loggerFactory = this.container.resolve<ILoggerFactory>("loggerFactory");
        this.logger = loggerFactory.createLogger("Socket");

        if (this.optionManager.getOption("autoConnect")) {
            this.logger.info("Auto-connecting socket");
            this.connection.connect();
        }

        this.logger.info("Socket instance created");
    }

    public reset(): void {
        this.logger.info("Resetting Socket instance");
        
        // Reset all services in proper order - channels first while connection is still active
        this.channels.reset(); 
        this.connection.reset();
        this.authManager.reset();
        this.optionManager.reset();
        
        // Clear container instances to ensure fresh state
        this.container.clearInstances();
    }
}

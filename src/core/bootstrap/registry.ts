import { ServiceContainer } from "./container";
import { Option } from "../../interfaces/option.interface";

// Core Service Implementations
import { OptionManager } from "../managers/option-manager";
import { HttpClient } from "../transport/http-client";
import { Logger } from "../shared/logger";
import { AuthManager } from "../managers/auth-manager";
import { WebSocketClient } from "../connections/websocket-client";
import { SocketChannelManager, RestChannelManager } from "../managers/channel-manager";
import { Connection } from "../connections/connection";

// Service Interfaces
import {
    IOptionManager,
    IHttpClient,
    ILogger,
    ILoggerFactory,
    IAuthManager,
    IWebSocketClient,
    ISocketChannelManager,
    IConnection,
} from "../../interfaces/services.interface";

/**
 * Logger factory implementation for creating component-specific loggers
 */
class LoggerFactory implements ILoggerFactory {
    constructor(
        private instanceId: string,
        private optionManager: IOptionManager
    ) {}

    createLogger(component: string): ILogger {
        return new Logger(this.instanceId, component, this.optionManager);
    }
}

/**
 * Register all services for Socket-based instances
 */
export function registerSocketServices(
    container: ServiceContainer,
    instanceId: string,
    options: Partial<Option> = {}
): void {
    // 1. Register foundational services (no dependencies)
    container.register<IOptionManager>(
        "optionManager",
        () => new OptionManager(options),
        { dependencies: [] }
    );

    container.register<IHttpClient>(
        "httpClient",
        () => new HttpClient(),
        { dependencies: [] }
    );

    // 2. Register logger factory (depends on optionManager)
    container.register<ILoggerFactory>(
        "loggerFactory",
        (c) => new LoggerFactory(instanceId, c.resolve<IOptionManager>("optionManager")),
        { dependencies: ["optionManager"] }
    );

    // 3. Register component loggers
    container.register<ILogger>(
        "authLogger",
        (c) => c.resolve<ILoggerFactory>("loggerFactory").createLogger("AuthManager"),
        { dependencies: ["loggerFactory"] }
    );

    container.register<ILogger>(
        "connectionLogger",
        (c) => c.resolve<ILoggerFactory>("loggerFactory").createLogger("Connection"),
        { dependencies: ["loggerFactory"] }
    );

    container.register<ILogger>(
        "wsClientLogger",
        (c) => c.resolve<ILoggerFactory>("loggerFactory").createLogger("WebSocketClient"),
        { dependencies: ["loggerFactory"] }
    );

    container.register<ILogger>(
        "socketChannelLogger",
        (c) => c.resolve<ILoggerFactory>("loggerFactory").createLogger("SocketChannelManager"),
        { dependencies: ["loggerFactory"] }
    );

    // 4. Register managers with dependencies
    container.register<IAuthManager>(
        "authManager",
        (c) => new AuthManager(
            c.resolve<IOptionManager>("optionManager"),
            c.resolve<IHttpClient>("httpClient"),
            c.resolve<ILogger>("authLogger")
        ),
        { dependencies: ["optionManager", "httpClient", "authLogger"] }
    );

    container.register<IWebSocketClient>(
        "wsClient",
        (c) => new WebSocketClient(c.resolve<ILogger>("wsClientLogger")),
        { dependencies: ["wsClientLogger"] }
    );

    container.register<ISocketChannelManager>(
        "socketChannelManager",
        (c) => new SocketChannelManager(
            c.resolve<IWebSocketClient>("wsClient"),
            c.resolve<ILogger>("socketChannelLogger")
        ),
        { dependencies: ["wsClient", "socketChannelLogger"] }
    );

    // 5. Register connection (depends on multiple services)
    container.register<IConnection>(
        "connection",
        (c) => new Connection(
            c.resolve<IOptionManager>("optionManager"),
            c.resolve<IAuthManager>("authManager"),
            c.resolve<IWebSocketClient>("wsClient"),
            c.resolve<ISocketChannelManager>("socketChannelManager"),
            c.resolve<ILogger>("connectionLogger")
        ),
        { 
            dependencies: [
                "optionManager", 
                "authManager", 
                "wsClient", 
                "socketChannelManager", 
                "connectionLogger"
            ] 
        }
    );
}

/**
 * Register all services for REST-based instances
 */
export function registerRestServices(
    container: ServiceContainer,
    instanceId: string,
    options: Partial<Option> = {}
): void {
    // 1. Register foundational services (no dependencies)
    container.register<IOptionManager>(
        "optionManager",
        () => new OptionManager(options),
        { dependencies: [] }
    );

    container.register<IHttpClient>(
        "httpClient",
        () => new HttpClient(),
        { dependencies: [] }
    );

    // 2. Register logger factory (depends on optionManager)
    container.register<ILoggerFactory>(
        "loggerFactory",
        (c) => new LoggerFactory(instanceId, c.resolve<IOptionManager>("optionManager")),
        { dependencies: ["optionManager"] }
    );

    // 3. Register component loggers
    container.register<ILogger>(
        "authLogger",
        (c) => c.resolve<ILoggerFactory>("loggerFactory").createLogger("AuthManager"),
        { dependencies: ["loggerFactory"] }
    );

    container.register<ILogger>(
        "restChannelLogger",
        (c) => c.resolve<ILoggerFactory>("loggerFactory").createLogger("RestChannelManager"),
        { dependencies: ["loggerFactory"] }
    );

    // 4. Register managers with dependencies
    container.register<IAuthManager>(
        "authManager",
        (c) => new AuthManager(
            c.resolve<IOptionManager>("optionManager"),
            c.resolve<IHttpClient>("httpClient"),
            c.resolve<ILogger>("authLogger")
        ),
        { dependencies: ["optionManager", "httpClient", "authLogger"] }
    );

    container.register<RestChannelManager>(
        "restChannelManager",
        (c) => new RestChannelManager(
            c.resolve<IHttpClient>("httpClient"),
            c.resolve<IAuthManager>("authManager"),
            c.resolve<IOptionManager>("optionManager"),
            c.resolve<ILogger>("restChannelLogger")
        ),
        { dependencies: ["httpClient", "authManager", "optionManager", "restChannelLogger"] }
    );
}

/**
 * Bootstrap a container with validation
 */
export function bootstrapContainer(
    container: ServiceContainer,
    type: "socket" | "rest",
    instanceId: string,
    options: Partial<Option> = {}
): void {
    // Register services based on type
    if (type === "socket") {
        registerSocketServices(container, instanceId, options);
    } else {
        registerRestServices(container, instanceId, options);
    }

    // Validate all service dependencies
    try {
        container.validate();
    } catch (error) {
        throw new Error(
            `Service container validation failed for ${type} instance '${instanceId}': ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }
} 
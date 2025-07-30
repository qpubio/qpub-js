import { Rest } from "./core/rest";
import { Socket } from "./core/socket";

// Re-export core types for convenience
export type { Message } from "./interfaces/message.interface";
export type { Option } from "./interfaces/option.interface";
export type { TokenOptions, TokenRequest, AuthResponse } from "./interfaces/token.interface";

// Re-export service interfaces for advanced usage and testing
export type {
    IOptionManager,
    IAuthManager,
    IWebSocketClient,
    IConnection,
    IChannelManager,
    ISocketChannelManager,
    IHttpClient,
    ILogger,
    ILoggerFactory,
} from "./interfaces/services.interface";

// Re-export dependency injection utilities for advanced usage
export {
    ServiceContainer,
    type ServiceLifetime,
    type ServiceRegistrationOptions,
    registerSocketServices,
    registerRestServices,
    bootstrapContainer,
} from "./core/shared";

// Re-export testing utilities for unit testing
export {
    TestContainer,
    createTestSocketContainer,
    createTestRestContainer,
    MockFactory,
    TestUtils,
} from "./testing";

// Re-export event constants and types for consumer use
export { 
    ConnectionEvents, 
    ChannelEvents, 
    AuthEvents 
} from "./types/consumer-events";

export type { 
    ConnectionEvent,
    ChannelEvent, 
    AuthEvent,
    ConnectionEventPayloads,
    ChannelEventPayloads,
    AuthEventPayloads,
    EventListener,
    ConnectionEventListener,
    ChannelEventListener, 
    AuthEventListener,
    ConnectionEventListeners,
    ChannelEventListeners,
    AuthEventListeners
} from "./types/consumer-events";

export const QPub = {
    Rest: Rest,
    Socket: Socket,
} as const;

export { Rest, Socket };

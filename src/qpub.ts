import { Rest } from "./core/rest";
import { Socket } from "./core/socket";

// Re-export core types for convenience
export type { Message } from "./types/protocol/messages";
export type { Option } from "./types/config/options";
export type { TokenOptions, TokenRequest, AuthResponse, Permission } from "./types/config/auth";

// Re-export service interfaces for advanced usage and testing
export type {
    IOptionManager,
    IAuthManager,
    IChannelManager,
    ISocketChannelManager,
} from "./types/services/managers";
export type {
    IWebSocketClient,
    IHttpClient,
    ILogger,
    ILoggerFactory,
} from "./types/services/clients";
export type { IConnection } from "./types/services/connection";

// Re-export dependency injection utilities for advanced usage
export {
    ServiceContainer,
    type ServiceLifetime,
    type ServiceRegistrationOptions,
    registerSocketServices,
    registerRestServices,
    bootstrapContainer,
} from "./core/bootstrap";

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
} from "./types/events/constants";

export type { 
    ConnectionEvent,
    ChannelEvent, 
    AuthEvent,
} from "./types/events/constants";

export type {
    ConnectionEventPayloads,
    ChannelEventPayloads,
    AuthEventPayloads,
} from "./types/events/payloads";

export type {
    EventListener,
    ConnectionEventListener,
    ChannelEventListener, 
    AuthEventListener,
    ConnectionEventListeners,
    ChannelEventListeners,
    AuthEventListeners
} from "./types/events/listeners";

export const QPub = {
    Rest: Rest,
    Socket: Socket,
} as const;

export { Rest, Socket };

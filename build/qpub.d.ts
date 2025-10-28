import { Rest } from "./core/rest";
import { Socket } from "./core/socket";
export type { Message } from "./types/protocol/messages";
export type { Option } from "./types/config/options";
export type { TokenOptions, TokenRequest, AuthResponse } from "./types/config/auth";
export type { IOptionManager, IAuthManager, IChannelManager, ISocketChannelManager, } from "./types/services/managers";
export type { IWebSocketClient, IHttpClient, ILogger, ILoggerFactory, } from "./types/services/clients";
export type { IConnection } from "./types/services/connection";
export { ServiceContainer, type ServiceLifetime, type ServiceRegistrationOptions, registerSocketServices, registerRestServices, bootstrapContainer, } from "./core/bootstrap";
export { TestContainer, createTestSocketContainer, createTestRestContainer, MockFactory, TestUtils, } from "./testing";
export { ConnectionEvents, ChannelEvents, AuthEvents } from "./types/events/constants";
export type { ConnectionEvent, ChannelEvent, AuthEvent, } from "./types/events/constants";
export type { ConnectionEventPayloads, ChannelEventPayloads, AuthEventPayloads, } from "./types/events/payloads";
export type { EventListener, ConnectionEventListener, ChannelEventListener, AuthEventListener, ConnectionEventListeners, ChannelEventListeners, AuthEventListeners } from "./types/events/listeners";
export declare const QPub: {
    readonly Rest: typeof Rest;
    readonly Socket: typeof Socket;
};
export { Rest, Socket };

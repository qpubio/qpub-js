// Service Interfaces
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
} from "./services.interface";

// Existing interfaces
export type { Option } from "./option.interface";
export type { Message } from "./message.interface";
export type { QPubWebSocket } from "./websocket.interface";
export type { JWTPayload } from "./jwt.interface";
export type {
    TokenOptions,
    TokenRequest,
    AuthResponse,
} from "./token.interface";

import { Rest } from "./core/rest";
import { Socket } from "./core/socket";

// Re-export core types for convenience
export type { Message } from "./interfaces/message.interface";

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

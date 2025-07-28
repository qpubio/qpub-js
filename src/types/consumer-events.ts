// Import types first
import type { 
    ConnectionEventPayloads, 
    ChannelEventPayloads, 
    AuthEventPayloads 
} from './internal-events';

// Re-export event constants for runtime usage
export { ConnectionEvents, ChannelEvents, AuthEvents } from './event.type';
export type { ConnectionEvent, ChannelEvent, AuthEvent } from './event.type';

// Re-export event payload types for type-safe event handling  
export type { 
    ConnectionEventPayloads, 
    ChannelEventPayloads, 
    AuthEventPayloads 
} from './internal-events';

// Helper types for consumer type-safe event handling
export type EventListener<T = any> = (payload: T) => void;

// Type-safe event listener helpers for each domain
export type ConnectionEventListener<K extends keyof ConnectionEventPayloads> = 
    EventListener<ConnectionEventPayloads[K]>;

export type ChannelEventListener<K extends keyof ChannelEventPayloads> = 
    EventListener<ChannelEventPayloads[K]>;

export type AuthEventListener<K extends keyof AuthEventPayloads> = 
    EventListener<AuthEventPayloads[K]>;

// Complete event listener maps for advanced users
export type ConnectionEventListeners = {
    [K in keyof ConnectionEventPayloads]: ConnectionEventListener<K>;
};

export type ChannelEventListeners = {
    [K in keyof ChannelEventPayloads]: ChannelEventListener<K>;
};

export type AuthEventListeners = {
    [K in keyof AuthEventPayloads]: AuthEventListener<K>;
}; 
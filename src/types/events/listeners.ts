/**
 * Event Listeners
 * 
 * Type-safe event listener definitions for consumers.
 * These provide autocomplete and type checking for event handlers.
 */

import type { 
    ConnectionEventPayloads, 
    ChannelEventPayloads, 
    AuthEventPayloads 
} from "./payloads";

/**
 * Generic event listener function type
 */
export type EventListener = (...args: any[]) => void;

/**
 * Type-safe connection event listener
 * Usage: on('connected', (payload) => { ... })
 */
export type ConnectionEventListener<K extends keyof ConnectionEventPayloads> = 
    (payload: ConnectionEventPayloads[K]) => void;

/**
 * Type-safe channel event listener
 * Usage: on('subscribed', (payload) => { ... })
 */
export type ChannelEventListener<K extends keyof ChannelEventPayloads> = 
    (payload: ChannelEventPayloads[K]) => void;

/**
 * Type-safe auth event listener
 * Usage: on('token_updated', (payload) => { ... })
 */
export type AuthEventListener<K extends keyof AuthEventPayloads> = 
    (payload: AuthEventPayloads[K]) => void;

/**
 * Complete event listener maps for advanced users
 */
export type ConnectionEventListeners = {
    [K in keyof ConnectionEventPayloads]: ConnectionEventListener<K>;
};

export type ChannelEventListeners = {
    [K in keyof ChannelEventPayloads]: ChannelEventListener<K>;
};

export type AuthEventListeners = {
    [K in keyof AuthEventPayloads]: AuthEventListener<K>;
};


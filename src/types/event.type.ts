export const ConnectionEvents = {
    INITIALIZED: "initialized",
    CONNECTING: "connecting",
    OPENED: "opened",
    CONNECTED: "connected",
    DISCONNECTED: "disconnected",
    CLOSING: "closing",
    CLOSED: "closed",
    FAILED: "failed",
} as const;

export type ConnectionEvent =
    (typeof ConnectionEvents)[keyof typeof ConnectionEvents];

export const ChannelEvents = {
    INITIALIZED: "initialized",
    SUBSCRIBING: "subscribing",
    SUBSCRIBED: "subscribed",
    UNSUBSCRIBING: "unsubscribing",
    UNSUBSCRIBED: "unsubscribed",
    PAUSED: "paused",
    RESUMED: "resumed",
    FAILED: "failed",
} as const;

export type ChannelEvent = (typeof ChannelEvents)[keyof typeof ChannelEvents];

export const AuthEvents = {
    TOKEN_UPDATED: "token_updated",  // When a new token is set
    TOKEN_EXPIRED: "token_expired",  // When current token expires
    TOKEN_ERROR: "token_error",      // When token-related errors occur
    AUTH_ERROR: "auth_error"         // When authentication fails
} as const;

export type AuthEvent = typeof AuthEvents[keyof typeof AuthEvents];
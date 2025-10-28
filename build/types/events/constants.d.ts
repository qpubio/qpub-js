/**
 * Event Constants
 *
 * Event names used throughout the SDK for the event emitter system.
 * These are distinct from protocol ActionTypes - they represent internal
 * state changes and notifications within the SDK.
 */
export declare const ConnectionEvents: {
    readonly INITIALIZED: "initialized";
    readonly CONNECTING: "connecting";
    readonly OPENED: "opened";
    readonly CONNECTED: "connected";
    readonly DISCONNECTED: "disconnected";
    readonly CLOSING: "closing";
    readonly CLOSED: "closed";
    readonly FAILED: "failed";
};
export type ConnectionEvent = (typeof ConnectionEvents)[keyof typeof ConnectionEvents];
export declare const ChannelEvents: {
    readonly INITIALIZED: "initialized";
    readonly SUBSCRIBING: "subscribing";
    readonly SUBSCRIBED: "subscribed";
    readonly UNSUBSCRIBING: "unsubscribing";
    readonly UNSUBSCRIBED: "unsubscribed";
    readonly PAUSED: "paused";
    readonly RESUMED: "resumed";
    readonly FAILED: "failed";
};
export type ChannelEvent = (typeof ChannelEvents)[keyof typeof ChannelEvents];
export declare const AuthEvents: {
    readonly TOKEN_UPDATED: "token_updated";
    readonly TOKEN_EXPIRED: "token_expired";
    readonly TOKEN_ERROR: "token_error";
    readonly AUTH_ERROR: "auth_error";
};
export type AuthEvent = typeof AuthEvents[keyof typeof AuthEvents];
//# sourceMappingURL=constants.d.ts.map
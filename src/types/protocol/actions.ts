/**
 * Protocol Actions
 * 
 * Action types and helpers that match the backend WebSocket protocol.
 * These define the communication contract between client and server.
 */

// Action types enum matching backend protocol
export enum ActionType {
    // Connection actions
    CONNECT = 0,
    CONNECTED = 1,
    DISCONNECT = 2,
    DISCONNECTED = 3,

    // Channel actions
    SUBSCRIBE = 4,
    SUBSCRIBED = 5,
    UNSUBSCRIBE = 6,
    UNSUBSCRIBED = 7,

    // Data Message actions
    PUBLISH = 8,
    PUBLISHED = 9,
    MESSAGE = 10,

    // Error actions
    ERROR = 11,

    // Heartbeat actions (for browser compatibility)
    PING = 12,
    PONG = 13
}

// Action type string mapping
export const ActionStrings: Record<ActionType, string> = {
    [ActionType.CONNECT]: "connect",
    [ActionType.CONNECTED]: "connected",
    [ActionType.DISCONNECT]: "disconnect",
    [ActionType.DISCONNECTED]: "disconnected",
    [ActionType.SUBSCRIBE]: "subscribe",
    [ActionType.SUBSCRIBED]: "subscribed",
    [ActionType.UNSUBSCRIBE]: "unsubscribe",
    [ActionType.UNSUBSCRIBED]: "unsubscribed",
    [ActionType.PUBLISH]: "publish",
    [ActionType.PUBLISHED]: "published",
    [ActionType.MESSAGE]: "message",
    [ActionType.ERROR]: "error",
    [ActionType.PING]: "ping",
    [ActionType.PONG]: "pong"
};

// Helper to convert ActionType to string
export function actionToString(action: ActionType): string {
    return ActionStrings[action];
}

// Grouping of action types for type safety
export const ConnectionActions = [
    ActionType.CONNECT,
    ActionType.CONNECTED,
    ActionType.DISCONNECT,
    ActionType.DISCONNECTED
] as const;

export type ConnectionAction = typeof ConnectionActions[number];

export const ChannelActions = [
    ActionType.SUBSCRIBE,
    ActionType.UNSUBSCRIBE,
    ActionType.PUBLISH
] as const;

export type ChannelAction = typeof ChannelActions[number];

export const ChannelResponseActions = [
    ActionType.SUBSCRIBED,
    ActionType.UNSUBSCRIBED,
    ActionType.PUBLISHED,
    ActionType.MESSAGE
] as const;

export type ChannelResponseAction = typeof ChannelResponseActions[number];

export const ErrorActions = [
    ActionType.ERROR
] as const;

export type ErrorAction = typeof ErrorActions[number];

// Combined types for message interfaces
export type OutgoingAction = ActionType.CONNECT | ActionType.DISCONNECT | ActionType.SUBSCRIBE | ActionType.UNSUBSCRIBE | ActionType.PUBLISH | ActionType.PING;
export type IncomingAction = ActionType.CONNECTED | ActionType.DISCONNECTED | ActionType.SUBSCRIBED | ActionType.UNSUBSCRIBED | ActionType.PUBLISHED | ActionType.MESSAGE | ActionType.ERROR | ActionType.PING | ActionType.PONG;


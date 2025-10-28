/**
 * Protocol Actions
 *
 * Action types and helpers that match the backend WebSocket protocol.
 * These define the communication contract between client and server.
 */
export declare enum ActionType {
    CONNECT = 0,
    CONNECTED = 1,
    DISCONNECT = 2,
    DISCONNECTED = 3,
    SUBSCRIBE = 4,
    SUBSCRIBED = 5,
    UNSUBSCRIBE = 6,
    UNSUBSCRIBED = 7,
    PUBLISH = 8,
    PUBLISHED = 9,
    MESSAGE = 10,
    ERROR = 11,
    PING = 12,
    PONG = 13
}
export declare const ActionStrings: Record<ActionType, string>;
export declare function actionToString(action: ActionType): string;
export declare const ConnectionActions: readonly [ActionType.CONNECT, ActionType.CONNECTED, ActionType.DISCONNECT, ActionType.DISCONNECTED];
export type ConnectionAction = typeof ConnectionActions[number];
export declare const ChannelActions: readonly [ActionType.SUBSCRIBE, ActionType.UNSUBSCRIBE, ActionType.PUBLISH];
export type ChannelAction = typeof ChannelActions[number];
export declare const ChannelResponseActions: readonly [ActionType.SUBSCRIBED, ActionType.UNSUBSCRIBED, ActionType.PUBLISHED, ActionType.MESSAGE];
export type ChannelResponseAction = typeof ChannelResponseActions[number];
export declare const ErrorActions: readonly [ActionType.ERROR];
export type ErrorAction = typeof ErrorActions[number];
export type OutgoingAction = ActionType.CONNECT | ActionType.DISCONNECT | ActionType.SUBSCRIBE | ActionType.UNSUBSCRIBE | ActionType.PUBLISH | ActionType.PING;
export type IncomingAction = ActionType.CONNECTED | ActionType.DISCONNECTED | ActionType.SUBSCRIBED | ActionType.UNSUBSCRIBED | ActionType.PUBLISHED | ActionType.MESSAGE | ActionType.ERROR | ActionType.PING | ActionType.PONG;
//# sourceMappingURL=actions.d.ts.map
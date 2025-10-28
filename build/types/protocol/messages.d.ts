/**
 * Protocol Messages
 *
 * Message interfaces for WebSocket and REST communication.
 * These define the structure of data exchanged between client and server.
 */
import { ActionType, OutgoingAction, IncomingAction } from "./actions";
export interface BaseMessage {
    action: ActionType;
    error?: ErrorInfo;
}
export interface IncomingMessage extends BaseMessage {
    action: IncomingAction;
}
export interface OutgoingMessage extends BaseMessage {
    action: OutgoingAction;
}
export interface IncomingConnectionMessage extends IncomingMessage {
    action: ActionType.CONNECTED | ActionType.DISCONNECTED;
    connection_id: string;
    connection_details?: ConnectionDetails;
}
export interface OutgoingConnectionMessage extends OutgoingMessage {
    action: ActionType.CONNECT | ActionType.DISCONNECT;
    connection_id?: string;
    connection_details?: ConnectionDetails;
}
export interface ConnectionDetails {
    alias: string;
    client_id: string;
    server_id: string;
}
export interface IncomingChannelMessage extends IncomingMessage {
    action: ActionType.SUBSCRIBED | ActionType.UNSUBSCRIBED | ActionType.PUBLISHED;
    channel: string;
    subscription_id?: string;
}
export interface OutgoingChannelMessage extends OutgoingMessage {
    action: ActionType.SUBSCRIBE | ActionType.UNSUBSCRIBE;
    channel: string;
}
export interface IncomingDataMessage extends IncomingMessage {
    action: ActionType.MESSAGE;
    id: string;
    timestamp: string;
    channel: string;
    messages: DataMessagePayload[];
}
export interface OutgoingDataMessage extends OutgoingMessage {
    action: ActionType.PUBLISH;
    channel: string;
    messages: DataMessagePayload[];
}
export interface DataMessagePayload {
    alias?: string;
    event?: string;
    data?: any;
}
export interface Message extends BaseMessage, DataMessagePayload {
    id?: string;
    timestamp?: string;
    channel: string;
}
export interface ErrorMessage extends IncomingMessage {
    action: ActionType.ERROR;
    error: ErrorInfo;
}
export interface ErrorInfo {
    code: number;
    href: string;
    message: string;
    statusCode: number;
}
export interface PingMessage extends IncomingMessage {
    action: ActionType.PING;
    timestamp: number;
}
export interface PongMessage extends IncomingMessage {
    action: ActionType.PONG;
    timestamp: number;
}
export interface RestPublishRequest {
    channels?: string[];
    messages: DataMessagePayload[];
}
//# sourceMappingURL=messages.d.ts.map
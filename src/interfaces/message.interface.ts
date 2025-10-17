import {
    ActionType,
    OutgoingAction,
    IncomingAction,
} from "../types/action.type";

//
// Base message
//

// Base interface for all messages
export interface BaseMessage {
    action: ActionType;
    error?: ErrorInfo;
}

//
// Any incoming and outgoing message
//

// Incoming message types
export interface IncomingMessage extends BaseMessage {
    action: IncomingAction;
}

// Outgoing message types
export interface OutgoingMessage extends BaseMessage {
    action: OutgoingAction;
}

//
// Connection message
//

// Incoming connection message
export interface IncomingConnectionMessage extends IncomingMessage {
    action: ActionType.CONNECTED | ActionType.DISCONNECTED;
    connection_id: string;
    connection_details?: ConnectionDetails;
}

// Outgoing connection message (Not used yet)
export interface OutgoingConnectionMessage extends OutgoingMessage {
    action: ActionType.CONNECT | ActionType.DISCONNECT;
    connection_id?: string;
    connection_details?: ConnectionDetails;
}

// Connection details interface
export interface ConnectionDetails {
    alias: string;
    client_id: string;
    server_id: string;
}

//
// Channel message
//

// Incoming channel message (Not used yet)
export interface IncomingChannelMessage extends IncomingMessage {
    action:
        | ActionType.SUBSCRIBED
        | ActionType.UNSUBSCRIBED
        | ActionType.PUBLISHED;
    channel: string;
    subscription_id?: string;
}

// Outgoing channel message
export interface OutgoingChannelMessage extends OutgoingMessage {
    action: ActionType.SUBSCRIBE | ActionType.UNSUBSCRIBE;
    channel: string;
}

//
// Data message
//

// Incoming data message
export interface IncomingDataMessage extends IncomingMessage {
    action: ActionType.MESSAGE;
    id: string;
    timestamp: string;
    channel: string;
    messages: DataMessagePayload[];
}

// Outgoing data message
export interface OutgoingDataMessage extends OutgoingMessage {
    action: ActionType.PUBLISH;
    channel: string;
    messages: DataMessagePayload[];
}

// Data message payload interface
export interface DataMessagePayload {
    alias?: string;
    event?: string;
    data?: any;
}

// Consumer data message
export interface Message extends BaseMessage, DataMessagePayload {
    id?: string;
    timestamp?: string;
    channel: string;
}

//
// Error
//

// Error message
export interface ErrorMessage extends IncomingMessage {
    action: ActionType.ERROR;
    error: ErrorInfo;
}

// Error information interface
export interface ErrorInfo {
    code: number;
    href: string;
    message: string;
    statusCode: number;
}

//
// Ping/Pong
//

// Ping message
export interface PingMessage extends IncomingMessage {
    action: ActionType.PING;
    timestamp: number;
}

// Pong message
export interface PongMessage extends IncomingMessage {
    action: ActionType.PONG;
    timestamp: number;
}

//
// REST
//

// REST channel publish request payload interface
export interface RestPublishRequest {
    channels?: string[];
    messages: DataMessagePayload[];
}

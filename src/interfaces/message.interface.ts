import {
    ActionType,
    OutgoingAction,
    IncomingAction,
    ConnectionAction,
} from "types/action.type";

// Error information interface matching backend protocol
export interface ErrorInfo {
    code: number;
    href: string;
    message: string;
    statusCode: number;
}

// Base interface for all messages
export interface BaseMessage {
    action: ActionType;
    error?: ErrorInfo;
}

// Connection details interface
export interface ConnectionDetails {
    clientId: string;
    serverId: string;
}

// Connection message interface
export interface ConnectionMessage extends BaseMessage {
    action: ConnectionAction;
    connectionId: string;
    connectionDetails?: ConnectionDetails;
}

// Channel message interface
export interface ChannelMessage extends BaseMessage {
    channel: string;
    subscriptionId?: string;
}

// Data message payload interface
export interface DataMessagePayload {
    clientId?: string;
    event?: string;
    data?: any;
}

// Data message interface for publishing and receiving messages
export interface DataMessage extends BaseMessage {
    id?: string;
    timestamp?: string;
    channel: string;
    messages?: DataMessagePayload[];
}

// REST channel publish request payload interface
export interface RestPublishRequest {
    channels?: string[];
    messages: DataMessagePayload[];
}

// Outgoing message types
export interface OutgoingMessage extends BaseMessage {
    action: OutgoingAction;
}

// Outgoing connection message
export interface OutgoingConnectionMessage extends OutgoingMessage {
    action: ActionType.CONNECT | ActionType.DISCONNECT;
    connectionId?: string;
    connectionDetails?: ConnectionDetails;
}

// Outgoing channel message
export interface OutgoingChannelMessage extends OutgoingMessage {
    action: ActionType.SUBSCRIBE | ActionType.UNSUBSCRIBE;
    channel: string;
    subscriptionId?: string;
}

// Outgoing data message
export interface OutgoingDataMessage extends OutgoingMessage {
    action: ActionType.PUBLISH;
    channel: string;
    messages: DataMessagePayload[];
}

// Incoming message types
export interface IncomingMessage extends BaseMessage {
    action: IncomingAction;
}

// Incoming connection message
export interface IncomingConnectionMessage extends IncomingMessage {
    action: ActionType.CONNECTED | ActionType.DISCONNECTED;
    connectionId: string;
    connectionDetails?: ConnectionDetails;
}

// Incoming channel message
export interface IncomingChannelMessage extends IncomingMessage {
    action:
        | ActionType.SUBSCRIBED
        | ActionType.UNSUBSCRIBED
        | ActionType.PUBLISHED;
    channel: string;
    subscriptionId?: string;
}

// Incoming data message
export interface IncomingDataMessage extends IncomingMessage {
    action: ActionType.MESSAGE;
    id: string;
    timestamp: string;
    channel: string;
    messages: DataMessagePayload[];
}

// Error message
export interface ErrorMessage extends IncomingMessage {
    action: ActionType.ERROR;
    error: ErrorInfo;
}

// Message (For consumer)
export interface Message extends BaseMessage, DataMessagePayload {
    id?: string;
    timestamp?: string;
    channel: string;
}

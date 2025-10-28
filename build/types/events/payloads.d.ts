/**
 * Event Payloads
 *
 * Type definitions for event payload data. These define what data is
 * passed to event listeners for each event type.
 */
import { ErrorInfo, ConnectionDetails, Message } from "../protocol/messages";
/**
 * Connection event payloads
 * Defines the data structure for each connection event
 */
export interface ConnectionEventPayloads {
    [key: string]: any;
    initialized: void;
    connecting: {
        attempt: number;
        url?: string;
    };
    opened: {
        connectionId?: string;
    };
    connected: {
        connectionId: string;
        connectionDetails?: ConnectionDetails;
    };
    disconnected: {
        reason?: string;
        code?: number;
    };
    closing: {
        reason?: string;
    };
    closed: {
        code?: number;
        reason?: string;
        wasClean?: boolean;
    };
    failed: {
        error: Error | ErrorInfo;
        context?: string;
    };
}
/**
 * Channel event payloads
 * Defines the data structure for each channel event
 */
export interface ChannelEventPayloads {
    [key: string]: any;
    initialized: {
        channelName: string;
    };
    subscribing: {
        channelName: string;
        subscriptionId?: string;
    };
    subscribed: {
        channelName: string;
        subscriptionId: string;
    };
    unsubscribing: {
        channelName: string;
        subscriptionId?: string;
    };
    unsubscribed: {
        channelName: string;
        subscriptionId?: string;
    };
    paused: {
        channelName: string;
        buffering: boolean;
    };
    resumed: {
        channelName: string;
        bufferedMessagesDelivered: number;
    };
    failed: {
        channelName: string;
        error: Error | ErrorInfo;
        action?: string;
    };
    message: Message;
}
/**
 * Auth event payloads
 * Defines the data structure for each authentication event
 */
export interface AuthEventPayloads {
    [key: string]: any;
    token_updated: {
        token: string;
        expiresAt?: Date;
    };
    token_expired: {
        expiredAt: Date;
        token?: string;
    };
    token_error: {
        error: Error | ErrorInfo;
        token?: string;
    };
    auth_error: {
        error: Error | ErrorInfo;
        context?: string;
    };
}
//# sourceMappingURL=payloads.d.ts.map
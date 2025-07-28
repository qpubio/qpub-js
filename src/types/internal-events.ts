import { ErrorInfo, ConnectionDetails, Message } from "../interfaces/message.interface";

// Internal event payload types for type safety within the library
// These are NOT exported to consumers

export interface ConnectionEventPayloads {
  [key: string]: any;
  initialized: void;
  connecting: { attempt: number; url?: string };
  opened: { connectionId?: string };
  connected: { connectionId: string; connectionDetails?: ConnectionDetails };
  disconnected: { reason?: string; code?: number };
  closing: { reason?: string };
  closed: { code?: number; reason?: string; wasClean?: boolean };
  failed: { error: Error | ErrorInfo; context?: string };
}

export interface ChannelEventPayloads {
  [key: string]: any;
  initialized: { channelName: string };
  subscribing: { channelName: string; subscriptionId?: string };
  subscribed: { channelName: string; subscriptionId: string };
  unsubscribing: { channelName: string; subscriptionId?: string };
  unsubscribed: { channelName: string; subscriptionId?: string };
  failed: { channelName: string; error: Error | ErrorInfo; action?: string };
  message: Message;
}

export interface AuthEventPayloads {
  [key: string]: any;
  token_updated: { token: string; expiresAt?: Date };
  token_expired: { expiredAt: Date; token?: string };
  token_error: { error: Error | ErrorInfo; token?: string };
  auth_error: { error: Error | ErrorInfo; context?: string };
} 
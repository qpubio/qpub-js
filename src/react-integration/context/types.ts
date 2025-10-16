import React from "react";
import { SocketChannel } from "../../core/channels/socket-channel";
import { Option } from "../../interfaces/option.interface";
import { ConnectionEvent, ChannelEvent } from "../../types/event.type";
import { AuthResponse, TokenRequest } from "../../interfaces/token.interface";
import { Message, ConnectionDetails } from "../../interfaces/message.interface";

// Re-export core types for convenience
export type { Message, ConnectionDetails };

// useChannel return type (Socket-only)
export interface UseChannelReturn {
    // The actual core SocketChannel instance
    channel: SocketChannel | null;

    // States
    status: ChannelEvent;
    error: Error | null;
    paused: boolean; // Reactive state for pause status
    ready: boolean; // True when both connection and channel are ready

    // Core SocketChannel methods
    subscribe: (callback: (message: Message) => void) => void;
    resubscribe: () => Promise<void>;
    unsubscribe: () => void;
    publish: (data: any, event?: string, alias?: string) => Promise<void>;
    isSubscribed: () => boolean;
    isPendingSubscribe: () => boolean;
    setPendingSubscribe: (pending: boolean) => void;
    pause: (options?: { bufferMessages?: boolean }) => void;
    resume: () => void;
    isPaused: () => boolean;
    clearBufferedMessages: () => void;
    reset: () => void;
    getName: () => string;
}

export interface UseAuthReturn {
    // States
    token: string | null;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    error: Error | null;

    // Core AuthManager methods
    authenticate: () => Promise<AuthResponse | null>;
    clearToken: () => void;
    shouldAutoAuthenticate: () => boolean;
    getAuthHeaders: () => HeadersInit;
    getAuthQueryParams: () => string;
    getAuthenticateUrl: (baseUrl: string) => string;
    requestToken: (request: TokenRequest) => Promise<AuthResponse>;
}

export interface UseConnectionReturn {
    // States
    status: ConnectionEvent;
    connectionId: string | null;
    connectionDetails: ConnectionDetails | null;

    // Core Connection methods
    connect: () => Promise<void>;
    isConnected: () => boolean;
    disconnect: () => void;
    ping: () => Promise<number>;
    reset: () => void;
}

// Component prop types
export interface SocketProviderProps {
    children: React.ReactNode;
    options?: Partial<Option>;
    fallback?: React.ComponentType<{ error?: Error }>;
}

export interface ChannelProps {
    name: string;
    children: (state: UseChannelReturn) => React.ReactNode;
}

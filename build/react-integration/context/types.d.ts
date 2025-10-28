import React from "react";
import { SocketChannel } from "../../core/channels/socket-channel";
import { Option } from "../../types/config/options";
import { ConnectionEvent, ChannelEvent } from "../../types/events/constants";
import { AuthResponse, TokenRequest } from "../../types/config/auth";
import { Message, ConnectionDetails } from "../../types/protocol/messages";
export type { Message, ConnectionDetails };
export interface UseChannelReturn {
    channel: SocketChannel | null;
    status: ChannelEvent;
    error: Error | null;
    paused: boolean;
    ready: boolean;
    subscribe: (callback: (message: Message) => void, options?: {
        event?: string;
        timeout?: number;
    }) => Promise<void>;
    resubscribe: () => Promise<void>;
    unsubscribe: (callback?: (message: Message) => void, options?: {
        event?: string;
        timeout?: number;
    }) => Promise<void>;
    publish: (data: any, options?: {
        event?: string;
        alias?: string;
    }) => Promise<void>;
    isSubscribed: () => boolean;
    isPendingSubscribe: () => boolean;
    setPendingSubscribe: (pending: boolean) => void;
    pause: (options?: {
        bufferMessages?: boolean;
    }) => void;
    resume: () => void;
    isPaused: () => boolean;
    hasCallback: () => boolean;
    clearBufferedMessages: () => void;
    reset: () => void;
    getName: () => string;
}
export interface UseAuthReturn {
    token: string | null;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    error: Error | null;
    authenticate: () => Promise<AuthResponse | null>;
    clearToken: () => void;
    shouldAutoAuthenticate: () => boolean;
    getAuthHeaders: () => HeadersInit;
    getAuthQueryParams: () => string;
    getAuthenticateUrl: (baseUrl: string) => string;
    requestToken: (request: TokenRequest) => Promise<AuthResponse>;
}
export interface UseConnectionReturn {
    status: ConnectionEvent;
    connectionId: string | null;
    connectionDetails: ConnectionDetails | null;
    connect: () => Promise<void>;
    isConnected: () => boolean;
    disconnect: () => void;
    ping: () => Promise<number>;
    reset: () => void;
}
export interface SocketProviderProps {
    children: React.ReactNode;
    options?: Partial<Option>;
    fallback?: React.ComponentType<{
        error?: Error;
    }>;
}
export interface ChannelProps {
    name: string;
    children: (state: UseChannelReturn) => React.ReactNode;
}
//# sourceMappingURL=types.d.ts.map
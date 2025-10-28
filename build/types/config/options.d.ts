/**
 * Configuration Options
 *
 * SDK configuration options and defaults.
 */
import { TokenRequest } from "./auth";
export interface AuthOptions {
    headers?: Record<string, string>;
    body?: Record<string, any>;
}
export interface Option {
    apiKey?: string;
    authUrl?: string;
    authOptions?: AuthOptions;
    tokenRequest?: TokenRequest;
    alias?: string;
    httpHost?: string;
    httpPort?: number | null;
    wsHost?: string;
    wsPort?: number | null;
    isSecure?: boolean;
    autoConnect?: boolean;
    autoReconnect?: boolean;
    autoResubscribe?: boolean;
    autoAuthenticate?: boolean;
    connectTimeoutMs?: number;
    maxReconnectAttempts?: number;
    initialReconnectDelayMs?: number;
    maxReconnectDelayMs?: number;
    reconnectBackoffMultiplier?: number;
    resubscribeIntervalMs?: number;
    authenticateRetries?: number;
    authenticateRetryIntervalMs?: number;
    pingTimeoutMs?: number;
    debug?: boolean;
    logLevel?: "error" | "warn" | "info" | "debug" | "trace";
    logger?: (level: string, message: string, ...args: any[]) => void;
}
export declare const DEFAULT_OPTIONS: Option;
//# sourceMappingURL=options.d.ts.map
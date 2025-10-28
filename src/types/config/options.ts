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

    alias?: string; // Optional client alias for basic auth (untrusted client)

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

    resubscribeIntervalMs?: number; // Not used yet
    authenticateRetries?: number;
    authenticateRetryIntervalMs?: number;

    pingTimeoutMs?: number;

    debug?: boolean;
    logLevel?: "error" | "warn" | "info" | "debug" | "trace";
    logger?: (level: string, message: string, ...args: any[]) => void;
}

export const DEFAULT_OPTIONS: Option = {
    httpHost: "rest.qpub.io",
    httpPort: null,

    wsHost: "socket.qpub.io",
    wsPort: null,

    isSecure: true,

    autoConnect: true,
    autoReconnect: true,
    autoResubscribe: true,
    autoAuthenticate: true,

    connectTimeoutMs: 10000,

    maxReconnectAttempts: 10,
    initialReconnectDelayMs: 1000,
    maxReconnectDelayMs: 30000,
    reconnectBackoffMultiplier: 1.5,

    resubscribeIntervalMs: 1000,
    authenticateRetries: 3,
    authenticateRetryIntervalMs: 1000,

    pingTimeoutMs: 10000,

    debug: false,
    logLevel: "error",
};


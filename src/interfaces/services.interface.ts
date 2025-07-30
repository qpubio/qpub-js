import { EventEmitter } from "../core/shared/event-emitter";
import { Option } from "./option.interface";
import { AuthEventPayloads } from "../types/internal-events";
import { ConnectionEventPayloads } from "../types/internal-events";
import { QPubWebSocket } from "./websocket.interface";
import { TokenOptions } from "./token.interface";

/**
 * Interface for managing SDK options and configuration
 */
export interface IOptionManager {
    /**
     * Get all options or a specific option
     */
    getOption(): Option;
    getOption<K extends keyof Option>(optionName: K): Option[K];
    getOption<K extends keyof Option>(optionName?: K): Option | Option[K];

    /**
     * Set/update options
     */
    setOption(newOption: Partial<Option>): void;

    /**
     * Reset options to defaults
     */
    reset(): void;
}

/**
 * Interface for authentication management
 */
export interface IAuthManager extends EventEmitter<AuthEventPayloads> {
    /**
     * Authenticate using configured method
     */
    authenticate(): Promise<any>;

    /**
     * Check if currently authenticated
     */
    isAuthenticated(): boolean;

    /**
     * Check if should auto-authenticate
     */
    shouldAutoAuthenticate(): boolean;

    /**
     * Get authenticated URL with token
     */
    getAuthenticateUrl(baseUrl: string): string;

    /**
     * Request a new token
     */
    requestToken(request: any): Promise<any>;

    /**
     * Get current token
     */
    getCurrentToken(): string | null;

    /**
     * Get authentication headers for requests
     */
    getAuthHeaders(): HeadersInit;

    /**
     * Get current token (alias for getCurrentToken)
     */
    getToken(): string | null;

    /**
     * Clear current token
     */
    clearToken(): void;

    /**
     * Get authentication query parameters
     */
    getAuthQueryParams(): string;

    /**
     * Reset authentication state
     */
    reset(): void;
}

/**
 * Interface for WebSocket client management
 */
export interface IWebSocketClient {
    /**
     * Connect to WebSocket URL
     */
    connect(url: string): void;

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void;

    /**
     * Check if connected
     */
    isConnected(): boolean;

    /**
     * Get the underlying socket instance
     */
    getSocket(): QPubWebSocket | null;

    /**
     * Send data through the socket
     */
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;

    /**
     * Reset the client
     */
    reset(): void;
}

/**
 * Interface for connection management
 */
export interface IConnection extends EventEmitter<ConnectionEventPayloads> {
    /**
     * Connect to the server
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the server
     */
    disconnect(): void;

    /**
     * Check if connected
     */
    isConnected(): boolean;

    /**
     * Reset the connection
     */
    reset(): void;
}

/**
 * Interface for channel management
 */
export interface IChannelManager {
    /**
     * Get or create a channel
     */
    get(channelName: string): any; // Will be more specific when we define channel interfaces

    /**
     * Check if channel exists
     */
    has(channelName: string): boolean;

    /**
     * Remove a channel
     */
    remove(channelName: string): void;

    /**
     * Reset all channels
     */
    reset(): void;
}

/**
 * Interface for socket-specific channel management
 */
export interface ISocketChannelManager extends IChannelManager {
    /**
     * Resubscribe to all channels (after reconnection)
     */
    resubscribeAllChannels(): void;

    /**
     * Mark all channels as pending subscription
     */
    pendingSubscribeAllChannels(): void;
}

/**
 * Interface for HTTP client
 */
export interface IHttpClient {
    /**
     * Make a GET request
     */
    get<T = any>(url: string, headers?: HeadersInit): Promise<T>;

    /**
     * Make a POST request
     */
    post<T = any>(url: string, data?: any, headers?: HeadersInit): Promise<T>;

    /**
     * Make a PUT request
     */
    put<T = any>(url: string, data?: any, headers?: HeadersInit): Promise<T>;

    /**
     * Make a DELETE request
     */
    delete<T = any>(url: string, headers?: HeadersInit): Promise<T>;

    /**
     * Make a PATCH request
     */
    patch<T = any>(url: string, data?: any, headers?: HeadersInit): Promise<T>;
}

/**
 * Interface for logging functionality
 */
export interface ILogger {
    /**
     * Log error message
     */
    error(message: string, ...args: any[]): void;

    /**
     * Log warning message
     */
    warn(message: string, ...args: any[]): void;

    /**
     * Log info message
     */
    info(message: string, ...args: any[]): void;

    /**
     * Log debug message
     */
    debug(message: string, ...args: any[]): void;

    /**
     * Log trace message
     */
    trace(message: string, ...args: any[]): void;
}

/**
 * Factory interface for creating loggers
 */
export interface ILoggerFactory {
    /**
     * Create a logger for a specific component
     */
    createLogger(component: string): ILogger;
}

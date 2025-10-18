/**
 * Client Service Interfaces
 * 
 * Interfaces for client services including WebSocket, HTTP, and logging.
 */

import { QPubWebSocket } from "./websocket";

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


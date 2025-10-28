/**
 * Manager Service Interfaces
 *
 * Interfaces for SDK manager services including options, auth, and channels.
 */
import { EventEmitter } from "../../core/shared/event-emitter";
import { Option } from "../config/options";
import { AuthEventPayloads } from "../events/payloads";
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
    /**
     * Get abort signal for cancelling operations
     */
    getAbortSignal(): AbortSignal;
}
/**
 * Interface for channel management
 */
export interface IChannelManager {
    /**
     * Get or create a channel
     */
    get(channelName: string): any;
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
     * Release a reference to a channel. When reference count reaches 0,
     * the channel is automatically unsubscribed and removed.
     */
    release(channelName: string): void;
    /**
     * Resubscribe to all channels (after reconnection)
     */
    resubscribeAllChannels(): void;
    /**
     * Mark all channels as pending subscription
     */
    pendingSubscribeAllChannels(): void;
}
//# sourceMappingURL=managers.d.ts.map
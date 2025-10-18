/**
 * Channel Service Interface
 * 
 * Interface for channel operations and management.
 */

/**
 * Options for subscribing to a channel
 */
export interface SubscribeOptions {
    event?: string;
}

/**
 * Options for publishing to a channel
 */
export interface PublishOptions {
    event?: string;
    alias?: string;
}

/**
 * Channel interface for pub/sub operations
 */
export interface Channel {
    name: string;
    publish: (message: any, options?: PublishOptions) => Promise<void>;
    subscribe?(
        callback: (message: any) => void,
        options?: SubscribeOptions & { timeout?: number }
    ): Promise<void>;
    unsubscribe?(
        callback?: (message: any) => void,
        options?: SubscribeOptions & { timeout?: number }
    ): Promise<void>;
    pause?(options?: { bufferMessages?: boolean }): void;
    resume?(): void;
    isPaused?(): boolean;
    clearBufferedMessages?(): void;
    reset(): void;
}

/**
 * Channel manager interface
 */
export interface ChannelManager {
    get(channelName: string): Channel;
    reset(): void;
}


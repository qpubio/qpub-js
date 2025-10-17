export interface Channel {
    name: string;
    publish: (message: any, options?: PublishOptions) => Promise<void>;
    subscribe?(
        callback: (message: any) => void,
        options?: SubscribeOptions
    ): void;
    unsubscribe?(
        callback?: (message: any) => void,
        options?: SubscribeOptions
    ): void;
    pause?(options?: { bufferMessages?: boolean }): void;
    resume?(): void;
    isPaused?(): boolean;
    clearBufferedMessages?(): void;
    reset(): void;
}

export interface ChannelManager {
    get(channelName: string): Channel;
    reset(): void;
}

export interface SubscribeOptions {
    event?: string;
}

export interface PublishOptions {
    event?: string;
    alias?: string;
}

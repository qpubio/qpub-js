export interface Channel {
    name: string;
    publish: (message: any) => Promise<void>;
    subscribe?(callback: (message: any) => void): void;
    unsubscribe?(): void;
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

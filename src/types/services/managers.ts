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

import {
    AckJobOptions,
    EnqueueOptions,
    EnqueueResult,
    ListJobsOptions,
    NackJobOptions,
    PullJobsOptions,
    QueueConfig,
    QueueJob,
    QueueJobHandler,
    RegisterWorkerOptions,
    RunWorkerOptions,
    UpdateQueueConfigOptions,
    WorkerRegistration,
} from "../protocol/queue";

/**
 * Interface for REST queue management
 */
export interface IRestQueueManager {
    enqueue(
        queueName: string,
        payload: unknown,
        opts?: EnqueueOptions
    ): Promise<EnqueueResult>;

    getJob(queueName: string, jobId: string): Promise<QueueJob>;

    listJobs(queueName: string, opts?: ListJobsOptions): Promise<QueueJob[]>;

    cancelJob(queueName: string, jobId: string): Promise<void>;

    retryJob(queueName: string, jobId: string): Promise<void>;

    getConfig(queueName: string): Promise<QueueConfig>;

    updateConfig(
        queueName: string,
        opts: UpdateQueueConfigOptions
    ): Promise<QueueConfig>;

    registerWorker(opts: RegisterWorkerOptions): Promise<WorkerRegistration>;

    heartbeat(workerId: string): Promise<WorkerRegistration>;

    pull(queueName: string, opts?: PullJobsOptions): Promise<QueueJob[]>;

    ack(queueName: string, jobId: string, opts: AckJobOptions): Promise<void>;

    nack(queueName: string, jobId: string, opts: NackJobOptions): Promise<void>;

    runWorker(
        queueName: string,
        handler: QueueJobHandler,
        opts?: RunWorkerOptions
    ): Promise<void>;

    stopWorker(): void;

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


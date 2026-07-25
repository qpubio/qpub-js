/**
 * Queue protocol types
 *
 * Wire DTOs use snake_case to match backend JSON. Public types use camelCase.
 */

export interface EnqueueJobRequestWire {
    payload?: unknown;
    idempotency_key?: string;
    delay?: string;
    schedule_at?: string | null;
    metadata?: Record<string, unknown>;
}

export interface EnqueueJobResponseWire {
    job_id: string;
    status: string;
}

export interface QueueJobWire {
    id: string;
    queue_name: string;
    status: string;
    payload?: unknown;
    result?: unknown;
    idempotency_key?: string;
    attempt?: number;
    max_attempts?: number;
    schedule_at?: string;
    started_at?: string;
    completed_at?: string;
    worker_id?: string;
    error_message?: string;
    metadata?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
}

export interface JobsResponseWire {
    jobs: QueueJobWire[];
}

export interface PullJobsRequestWire {
    worker_id: string;
    batch_size: number;
    wait: string;
}

export interface AckJobRequestWire {
    worker_id: string;
    result?: unknown;
}

export interface NackJobRequestWire {
    worker_id: string;
    reason: string;
    retry_delay?: string;
}

export interface QueueConfigWire {
    name?: string;
    execution_profile?: string;
    visibility_timeout?: string;
    max_attempts?: number;
    retention?: string;
    max_payload_bytes?: number;
    webhook_url?: string;
    webhook_secret?: string;
    created_at?: string;
    updated_at?: string;
}

export interface UpdateQueueConfigRequestWire {
    execution_profile?: string;
    visibility_timeout?: string;
    max_attempts?: number;
    webhook_url?: string;
    webhook_secret?: string;
}

export interface RegisterWorkerRequestWire {
    name: string;
    queues: string[];
}

export interface WorkerResponseWire {
    id: string;
    name: string;
    queues: string[];
    last_seen_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface HeartbeatRequestWire {
    worker_id: string;
}

export interface QueueJob {
    id: string;
    queueName: string;
    status: string;
    payload?: unknown;
    result?: unknown;
    idempotencyKey?: string;
    attempt?: number;
    maxAttempts?: number;
    scheduleAt?: string;
    startedAt?: string;
    completedAt?: string;
    workerId?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export interface EnqueueOptions {
    delay?: string;
    idempotencyKey?: string;
    scheduleAt?: string | null;
    metadata?: Record<string, unknown>;
}

export interface EnqueueResult {
    jobId: string;
    status: string;
}

export interface ListJobsOptions {
    status?: string;
}

export interface RunWorkerOptions {
    workerId?: string;
    batchSize?: number;
    pollIntervalMs?: number;
    wait?: string;
}

export interface PullJobsOptions {
    workerId?: string;
    batchSize?: number;
    wait?: string;
}

export interface AckJobOptions {
    workerId: string;
    result?: unknown;
}

export interface NackJobOptions {
    workerId: string;
    reason?: string;
    retryDelay?: string;
}

export interface QueueConfig {
    name?: string;
    executionProfile?: string;
    visibilityTimeout?: string;
    maxAttempts?: number;
    retention?: string;
    maxPayloadBytes?: number;
    webhookUrl?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UpdateQueueConfigOptions {
    executionProfile?: string;
    visibilityTimeout?: string;
    maxAttempts?: number;
    webhookUrl?: string;
    webhookSecret?: string;
}

export interface RegisterWorkerOptions {
    name: string;
    queues: string[];
}

export interface WorkerRegistration {
    id: string;
    name: string;
    queues: string[];
    lastSeenAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type QueueJobHandler = (job: QueueJob) => Promise<unknown>;

export function toQueueJob(wire: QueueJobWire): QueueJob {
    return {
        id: wire.id,
        queueName: wire.queue_name,
        status: wire.status,
        payload: wire.payload,
        result: wire.result,
        idempotencyKey: wire.idempotency_key,
        attempt: wire.attempt,
        maxAttempts: wire.max_attempts,
        scheduleAt: wire.schedule_at,
        startedAt: wire.started_at,
        completedAt: wire.completed_at,
        workerId: wire.worker_id,
        errorMessage: wire.error_message,
        metadata: wire.metadata,
        createdAt: wire.created_at,
        updatedAt: wire.updated_at,
    };
}

export function toEnqueueResult(wire: EnqueueJobResponseWire): EnqueueResult {
    return {
        jobId: wire.job_id,
        status: wire.status,
    };
}

export function toQueueConfig(wire: QueueConfigWire): QueueConfig {
    return {
        name: wire.name,
        executionProfile: wire.execution_profile,
        visibilityTimeout: wire.visibility_timeout,
        maxAttempts: wire.max_attempts,
        retention: wire.retention,
        maxPayloadBytes: wire.max_payload_bytes,
        webhookUrl: wire.webhook_url,
        createdAt: wire.created_at,
        updatedAt: wire.updated_at,
    };
}

export function toWorkerRegistration(wire: WorkerResponseWire): WorkerRegistration {
    return {
        id: wire.id,
        name: wire.name,
        queues: wire.queues,
        lastSeenAt: wire.last_seen_at,
        createdAt: wire.created_at,
        updatedAt: wire.updated_at,
    };
}

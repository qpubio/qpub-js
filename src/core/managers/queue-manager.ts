import {
    IHttpClient,
    ILogger,
} from "../../types/services/clients";
import {
    IAuthManager,
    IOptionManager,
    IRestQueueManager,
} from "../../types/services/managers";
import {
    AckJobRequestWire,
    EnqueueJobRequestWire,
    EnqueueJobResponseWire,
    AckJobOptions,
    EnqueueOptions,
    EnqueueResult,
    HeartbeatRequestWire,
    JobsResponseWire,
    ListJobsOptions,
    NackJobOptions,
    NackJobRequestWire,
    PullJobsOptions,
    PullJobsRequestWire,
    QueueConfig,
    QueueConfigWire,
    QueueJob,
    QueueJobHandler,
    QueueJobWire,
    RegisterWorkerOptions,
    RunWorkerOptions,
    UpdateQueueConfigOptions,
    UpdateQueueConfigRequestWire,
    WorkerRegistration,
    WorkerResponseWire,
    RegisterWorkerRequestWire,
    toEnqueueResult,
    toQueueConfig,
    toQueueJob,
    toWorkerRegistration,
} from "../../types/protocol/queue";
import { buildRestBaseUrl } from "../shared/rest-url";

export class RestQueueManager implements IRestQueueManager {
    private httpClient: IHttpClient;
    private authManager: IAuthManager;
    private optionManager: IOptionManager;
    private logger: ILogger;
    private defaultWorkerId: string;
    private running = false;

    constructor(
        httpClient: IHttpClient,
        authManager: IAuthManager,
        optionManager: IOptionManager,
        logger: ILogger,
        instanceId: string
    ) {
        this.httpClient = httpClient;
        this.authManager = authManager;
        this.optionManager = optionManager;
        this.logger = logger;
        this.defaultWorkerId = `rest_worker_${instanceId}`;
    }

    private baseUrl(): string {
        return buildRestBaseUrl(this.optionManager);
    }

    private authHeaders(): HeadersInit {
        return this.authManager.getAuthHeaders();
    }

    public async enqueue(
        queueName: string,
        payload: unknown,
        opts?: EnqueueOptions
    ): Promise<EnqueueResult> {
        const body: EnqueueJobRequestWire = {
            payload,
            delay: opts?.delay,
            idempotency_key: opts?.idempotencyKey,
            schedule_at: opts?.scheduleAt,
            metadata: opts?.metadata,
        };

        const response = await this.httpClient.post<EnqueueJobResponseWire>(
            `${this.baseUrl()}/queue/${queueName}/jobs`,
            body,
            this.authHeaders()
        );

        return toEnqueueResult(response);
    }

    public async getJob(queueName: string, jobId: string): Promise<QueueJob> {
        const response = await this.httpClient.get<QueueJobWire>(
            `${this.baseUrl()}/queue/${queueName}/jobs/${jobId}`,
            this.authHeaders()
        );

        return toQueueJob(response);
    }

    public async listJobs(
        queueName: string,
        opts?: ListJobsOptions
    ): Promise<QueueJob[]> {
        const query = opts?.status ? `?status=${encodeURIComponent(opts.status)}` : "";
        const response = await this.httpClient.get<JobsResponseWire>(
            `${this.baseUrl()}/queue/${queueName}/jobs${query}`,
            this.authHeaders()
        );

        return (response.jobs ?? []).map(toQueueJob);
    }

    public async cancelJob(queueName: string, jobId: string): Promise<void> {
        await this.httpClient.delete(
            `${this.baseUrl()}/queue/${queueName}/jobs/${jobId}`,
            this.authHeaders()
        );
    }

    public async retryJob(queueName: string, jobId: string): Promise<void> {
        await this.httpClient.post(
            `${this.baseUrl()}/queue/${queueName}/jobs/${jobId}/retry`,
            {},
            this.authHeaders()
        );
    }

    public async getConfig(queueName: string): Promise<QueueConfig> {
        const response = await this.httpClient.get<QueueConfigWire>(
            `${this.baseUrl()}/queue/${queueName}`,
            this.authHeaders()
        );

        return toQueueConfig(response);
    }

    public async updateConfig(
        queueName: string,
        opts: UpdateQueueConfigOptions
    ): Promise<QueueConfig> {
        const body: UpdateQueueConfigRequestWire = {
            execution_profile: opts.executionProfile,
            visibility_timeout: opts.visibilityTimeout,
            max_attempts: opts.maxAttempts,
            webhook_url: opts.webhookUrl,
            webhook_secret: opts.webhookSecret,
        };

        const response = await this.httpClient.put<QueueConfigWire>(
            `${this.baseUrl()}/queue/${queueName}`,
            body,
            this.authHeaders()
        );

        return toQueueConfig(response);
    }

    public async registerWorker(
        opts: RegisterWorkerOptions
    ): Promise<WorkerRegistration> {
        const body: RegisterWorkerRequestWire = {
            name: opts.name,
            queues: opts.queues,
        };

        const response = await this.httpClient.post<WorkerResponseWire>(
            `${this.baseUrl()}/workers/register`,
            body,
            this.authHeaders()
        );

        return toWorkerRegistration(response);
    }

    public async heartbeat(workerId: string): Promise<WorkerRegistration> {
        const body: HeartbeatRequestWire = { worker_id: workerId };

        const response = await this.httpClient.post<WorkerResponseWire>(
            `${this.baseUrl()}/workers/heartbeat`,
            body,
            this.authHeaders()
        );

        return toWorkerRegistration(response);
    }

    public async pull(
        queueName: string,
        opts?: PullJobsOptions
    ): Promise<QueueJob[]> {
        const pullBody: PullJobsRequestWire = {
            worker_id: opts?.workerId ?? this.defaultWorkerId,
            batch_size: opts?.batchSize ?? 1,
            wait: opts?.wait ?? "20s",
        };

        const response = await this.httpClient.post<JobsResponseWire>(
            `${this.baseUrl()}/queue/${queueName}/pull`,
            pullBody,
            this.authHeaders()
        );

        return (response.jobs ?? []).map(toQueueJob);
    }

    public async ack(
        queueName: string,
        jobId: string,
        opts: AckJobOptions
    ): Promise<void> {
        const ackBody: AckJobRequestWire = {
            worker_id: opts.workerId,
            result: opts.result,
        };

        await this.httpClient.post(
            `${this.baseUrl()}/queue/${queueName}/jobs/${jobId}/ack`,
            ackBody,
            this.authHeaders()
        );
    }

    public async nack(
        queueName: string,
        jobId: string,
        opts: NackJobOptions
    ): Promise<void> {
        const nackBody: NackJobRequestWire = {
            worker_id: opts.workerId,
            reason: opts.reason ?? "nacked",
            retry_delay: opts.retryDelay,
        };

        await this.httpClient.post(
            `${this.baseUrl()}/queue/${queueName}/jobs/${jobId}/nack`,
            nackBody,
            this.authHeaders()
        );
    }

    public async runWorker(
        queueName: string,
        handler: QueueJobHandler,
        opts?: RunWorkerOptions
    ): Promise<void> {
        const workerId = opts?.workerId ?? this.defaultWorkerId;
        const batchSize = opts?.batchSize ?? 1;
        const pollIntervalMs = opts?.pollIntervalMs ?? 1000;
        const wait = opts?.wait ?? "20s";

        this.running = true;
        this.logger.info(`Starting queue worker on ${queueName}`);

        while (this.running) {
            try {
                const jobs = await this.pull(queueName, {
                    workerId,
                    batchSize,
                    wait,
                });

                for (const job of jobs) {
                    try {
                        const result = await handler(job);
                        await this.ack(queueName, job.id, { workerId, result });
                    } catch (err) {
                        await this.nack(queueName, job.id, {
                            workerId,
                            reason:
                                err instanceof Error
                                    ? err.message
                                    : "handler error",
                        });
                    }
                }
            } catch (error) {
                this.logger.error("Queue pull failed", error);
            }

            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
    }

    public stopWorker(): void {
        this.running = false;
    }

    public reset(): void {
        this.stopWorker();
    }
}

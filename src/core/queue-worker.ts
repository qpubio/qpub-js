import { Option } from "../types/config/options";
import { ServiceContainer, bootstrapContainer } from "./bootstrap";
import { uuidv7 } from "./shared";
import { HttpClient } from "./transport/http-client";
import {
    IOptionManager,
    IAuthManager,
} from "../types/services/managers";
import {
    ILogger,
    ILoggerFactory,
} from "../types/services/clients";

export interface QueueJob {
    id: string;
    queueName: string;
    status: string;
    payload?: unknown;
    attempt?: number;
}

export interface QueueWorkerOptions {
    queueName: string;
    workerId?: string;
    batchSize?: number;
    pollIntervalMs?: number;
    wait?: string;
}

export type QueueJobHandler = (job: QueueJob) => Promise<unknown>;

export class QueueWorker {
    private instanceId: string;
    private container: ServiceContainer;
    private optionManager: IOptionManager;
    private auth: IAuthManager;
    private httpClient: HttpClient;
    private logger: ILogger;
    private running = false;

    constructor(options?: Partial<Option>) {
        this.instanceId = `queue_worker_${uuidv7()}`;
        this.container = new ServiceContainer(this.instanceId);
        bootstrapContainer(this.container, "rest", this.instanceId, options);
        this.optionManager = this.container.resolve<IOptionManager>("optionManager");
        this.auth = this.container.resolve<IAuthManager>("authManager");
        this.httpClient = this.container.resolve<HttpClient>("httpClient");
        const loggerFactory = this.container.resolve<ILoggerFactory>("loggerFactory");
        this.logger = loggerFactory.createLogger("QueueWorker");
    }

    private baseUrl(): string {
        const host = this.optionManager.getOption("httpHost");
        const port = this.optionManager.getOption("httpPort");
        const isSecure = this.optionManager.getOption("isSecure");
        const protocol = isSecure ? "https" : "http";
        return `${protocol}://${host}${port ? `:${port}` : ""}/v1`;
    }

    public async enqueue(queueName: string, payload: unknown, opts?: { delay?: string; idempotencyKey?: string }) {
        const headers = this.auth.getAuthHeaders();
        return this.httpClient.post<{ jobId: string; status: string }>(
            `${this.baseUrl()}/queue/${queueName}/jobs`,
            { payload, delay: opts?.delay, idempotencyKey: opts?.idempotencyKey },
            headers
        );
    }

    public async start(queueName: string, handler: QueueJobHandler, opts?: Partial<QueueWorkerOptions>): Promise<void> {
        const workerId = opts?.workerId ?? this.instanceId;
        const batchSize = opts?.batchSize ?? 1;
        const pollIntervalMs = opts?.pollIntervalMs ?? 1000;
        const wait = opts?.wait ?? "20s";
        const headers = this.auth.getAuthHeaders();

        this.running = true;
        this.logger.info(`Starting queue worker on ${queueName}`);

        while (this.running) {
            try {
                const response = await this.httpClient.post<{ jobs: QueueJob[] }>(
                    `${this.baseUrl()}/queue/${queueName}/pull`,
                    { workerId, batchSize, wait },
                    headers
                );

                for (const job of response.jobs ?? []) {
                    try {
                        const result = await handler(job);
                        await this.httpClient.post(
                            `${this.baseUrl()}/queue/${queueName}/jobs/${job.id}/ack`,
                            { workerId, result },
                            headers
                        );
                    } catch (err) {
                        await this.httpClient.post(
                            `${this.baseUrl()}/queue/${queueName}/jobs/${job.id}/nack`,
                            { workerId, reason: err instanceof Error ? err.message : "handler error" },
                            headers
                        );
                    }
                }
            } catch (error) {
                this.logger.error("Queue pull failed", error);
            }

            await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
    }

    public stop(): void {
        this.running = false;
    }
}

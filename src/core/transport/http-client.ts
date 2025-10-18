import { IHttpClient } from "../../types/services/clients";

export class HttpClient implements IHttpClient {
    private defaultHeaders: HeadersInit;
    private fetchImpl: typeof fetch;

    constructor(defaultHeaders: HeadersInit = {}, customFetch?: typeof fetch) {
        this.defaultHeaders = {
            "Content-Type": "application/json",
            ...defaultHeaders,
        };
        this.fetchImpl = customFetch || this.getDefaultFetch();
    }

    private getDefaultFetch(): typeof fetch {
        if (typeof fetch === "function") {
            // Bind fetch to the global context to avoid "Illegal invocation" errors
            return fetch.bind(globalThis);
        }

        // Node.js environment without global fetch
        return this.createNodeFetch();
    }

    private createNodeFetch(): typeof fetch {
        // Only import Node.js modules if we're in Node.js environment
        const http = require("http");
        const https = require("https");
        const { URL } = require("url");

        return async (
            input: string | URL | RequestInfo,
            init?: RequestInit
        ) => {
            return new Promise((resolve, reject) => {
                const parsed =
                    typeof input === "string"
                        ? new URL(input)
                        : input instanceof URL
                        ? input
                        : new URL(input.toString());
                const protocol = parsed.protocol === "https:" ? https : http;
                const options = {
                    method: init?.method || "GET",
                    headers: init?.headers || {},
                    hostname: parsed.hostname,
                    path: parsed.pathname + parsed.search,
                    port:
                        parsed.port ||
                        (parsed.protocol === "https:" ? 443 : 80),
                };

                const req = protocol.request(options, (res: any) => {
                    const chunks: Buffer[] = [];
                    res.on("data", (chunk: Buffer) => chunks.push(chunk));
                    res.on("end", () => {
                        const body = Buffer.concat(chunks).toString();

                        const response = {
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            statusText: res.statusMessage,
                            headers: res.headers,
                            json: () => Promise.resolve(JSON.parse(body)),
                            text: () => Promise.resolve(body),
                        };

                        resolve(response as Response);
                    });
                });

                req.on("error", reject);

                if (init?.body) {
                    req.write(init.body);
                }
                req.end();
            });
        };
    }

    private async request<T>(url: string, options: RequestInit): Promise<T> {
        const response = await this.fetchImpl(url, {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status} ${response.statusText}`
            );
        }

        return response.json();
    }

    async get<T>(url: string, headers: HeadersInit = {}): Promise<T> {
        return this.request<T>(url, {
            method: "GET",
            headers,
        });
    }

    async post<T>(
        url: string,
        data: unknown,
        headers: HeadersInit = {}
    ): Promise<T> {
        return this.request<T>(url, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
    }

    async put<T>(
        url: string,
        data: unknown,
        headers: HeadersInit = {}
    ): Promise<T> {
        return this.request<T>(url, {
            method: "PUT",
            headers,
            body: JSON.stringify(data),
        });
    }

    async delete<T>(url: string, headers: HeadersInit = {}): Promise<T> {
        return this.request<T>(url, {
            method: "DELETE",
            headers,
        });
    }

    async patch<T>(
        url: string,
        data: unknown,
        headers: HeadersInit = {}
    ): Promise<T> {
        return this.request<T>(url, {
            method: "PATCH",
            headers,
            body: JSON.stringify(data),
        });
    }
}

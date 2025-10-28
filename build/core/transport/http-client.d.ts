import { IHttpClient } from "../../types/services/clients";
export declare class HttpClient implements IHttpClient {
    private defaultHeaders;
    private fetchImpl;
    constructor(defaultHeaders?: HeadersInit, customFetch?: typeof fetch);
    private getDefaultFetch;
    private createNodeFetch;
    private request;
    get<T>(url: string, headers?: HeadersInit): Promise<T>;
    post<T>(url: string, data: unknown, headers?: HeadersInit): Promise<T>;
    put<T>(url: string, data: unknown, headers?: HeadersInit): Promise<T>;
    delete<T>(url: string, headers?: HeadersInit): Promise<T>;
    patch<T>(url: string, data: unknown, headers?: HeadersInit): Promise<T>;
}
//# sourceMappingURL=http-client.d.ts.map
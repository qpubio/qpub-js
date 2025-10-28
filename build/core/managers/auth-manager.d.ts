import { EventEmitter } from "../shared/event-emitter";
import { AuthEventPayloads } from "../../types/events/payloads";
import { IOptionManager, IAuthManager } from "../../types/services/managers";
import { IHttpClient, ILogger } from "../../types/services/clients";
import { AuthResponse, TokenOptions, TokenRequest } from "../../types/config/auth";
export declare class AuthManager extends EventEmitter<AuthEventPayloads> implements IAuthManager {
    private optionManager;
    private httpClient;
    private currentToken;
    private refreshTimeout?;
    private logger;
    private _isResetting;
    private abortController;
    constructor(optionManager: IOptionManager, httpClient: IHttpClient, logger: ILogger);
    /**
     * Unified error handler for auth manager
     */
    private handleError;
    /**
     * Authenticates the client with the provided credentials
     * @returns Promise<string | null> The authenticated token or null if using apiKey directly
     * @throws Error if no authentication credentials are provided
     */
    authenticate(): Promise<AuthResponse | null>;
    private _authenticate;
    /**
     * Check if auto authentication is enabled
     */
    shouldAutoAuthenticate(): boolean;
    private setToken;
    getToken(): string | null;
    private scheduleTokenRefresh;
    clearToken(): void;
    getAuthHeaders(): HeadersInit;
    getAuthQueryParams(): string;
    getAuthenticateUrl(baseUrl: string): string;
    /**
     * Generates a QPub-compatible JWT token
     * Medium-low level of security
     * Should be called from server-side only
     * Note: The permissions are not validated by the server, so make sure to set the correct permissions that align with the API key or use the issueToken method instead
     * @param options - Token options
     * @returns Promise<string> The generated JWT token
     * @throws Error if apiKey is not provided or signing fails
     */
    generateToken(options?: TokenOptions): Promise<string>;
    /**
     * Issues a new JWT token from QPub server
     * Medium level of security
     * Should be called from server-side only
     * @param options - Token options
     * @returns Promise<string> The issued JWT token
     * @throws Error if apiKey is not provided or token request fails
     */
    issueToken(options?: TokenOptions): Promise<string>;
    /**
     * Creates a token request object for client-side token requests
     * High level of security
     * Should be called from server-side only
     * @param options - Token request options
     * @returns Promise<TokenRequest> Object to be used by client for token request
     * @throws Error if apiKey is not provided or signing fails
     */
    createTokenRequest(options?: TokenOptions): Promise<TokenRequest>;
    /**
     * Requests a token from QPub server using a TokenRequest
     * Should be called from client-side only
     * @param request - The token request object from auth server
     * @returns Promise<AuthResponse> QPub server's response containing the token
     */
    requestToken(request: TokenRequest): Promise<AuthResponse>;
    isAuthenticated(): boolean;
    getCurrentToken(): string | null;
    reset(): void;
    getAbortSignal(): AbortSignal;
}
//# sourceMappingURL=auth-manager.d.ts.map
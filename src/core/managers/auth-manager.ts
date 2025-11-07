import { EventEmitter } from "../shared/event-emitter";
import { AuthEventPayloads } from "../../types/events/payloads";
import {
    IOptionManager,
    IAuthManager,
} from "../../types/services/managers";
import {
    IHttpClient,
    ILogger,
} from "../../types/services/clients";
import { JWT } from "../shared/jwt";
import { JWTPayload } from "../../types/config/auth";
import {
    AuthResponse,
    TokenOptions,
    TokenRequest,
} from "../../types/config/auth";
import { Crypto } from "../shared/crypto";
import { ApiKey } from "../shared/api-key";
import { AuthEvents } from "../../types/events/constants";

export class AuthManager
    extends EventEmitter<AuthEventPayloads>
    implements IAuthManager
{
    private optionManager: IOptionManager;
    private httpClient: IHttpClient;
    private currentToken: string | null = null;
    private refreshTimeout?: NodeJS.Timeout;
    private logger: ILogger;
    private _isResetting: boolean = false; // Add reset flag
    private abortController: AbortController; // Add abort controller

    constructor(
        optionManager: IOptionManager,
        httpClient: IHttpClient,
        logger: ILogger
    ) {
        super();
        this.optionManager = optionManager;
        this.httpClient = httpClient;
        this.logger = logger;
        this.abortController = new AbortController();

        this.logger.debug("AuthManager created");

        const tokenRequest = this.optionManager.getOption("tokenRequest");
        if (tokenRequest) {
            this.logger.info("Initial token request found - requesting token");
            this.requestToken(tokenRequest).catch((error) => {
                this.logger.error("Initial token request failed:", error);
                this.emit(AuthEvents.TOKEN_ERROR, {
                    error:
                        error instanceof Error
                            ? error
                            : new Error("Unknown error"),
                });
            });
        } else {
            this.logger.debug("No initial token request provided");
        }
    }

    /**
     * Unified error handler for auth manager
     */
    private handleError(error: unknown, context: string): never {
        const formattedError =
            error instanceof Error
                ? new Error(`${context}: ${error.message}`)
                : new Error(`${context}: Unknown error`);

        this.logger.error(`${context}:`, error);

        // Emit appropriate event based on context
        if (context.includes("token")) {
            this.logger.debug("Emitting TOKEN_ERROR event");
            this.emit(AuthEvents.TOKEN_ERROR, { error: formattedError });
        } else if (context.includes("auth")) {
            this.logger.debug("Emitting AUTH_ERROR event");
            this.emit(AuthEvents.AUTH_ERROR, {
                error: formattedError,
                context,
            });
        }

        throw formattedError;
    }

    /**
     * Authenticates the client with the provided credentials
     * @returns Promise<string | null> The authenticated token or null if using apiKey directly
     * @throws Error if no authentication credentials are provided
     */
    public async authenticate(): Promise<AuthResponse | null> {
        this.logger.debug("Authenticate called");

        // Prevent authentication during reset
        if (this._isResetting) {
            this.logger.warn(
                "Authentication blocked - auth manager is resetting"
            );
            return null;
        }

        const retries =
            this.optionManager.getOption("authenticateRetries") || 0;
        const retryInterval =
            this.optionManager.getOption("authenticateRetryIntervalMs") || 1000;
        const tokenRequest = this.optionManager.getOption("tokenRequest");

        this.logger.info(
            `Starting authentication (retries: ${retries}, interval: ${retryInterval}ms)`
        );

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                this.logger.debug(
                    `Authentication attempt ${attempt + 1}/${retries + 1}`
                );

                // Check if reset was called during authentication
                if (this._isResetting || this.abortController.signal.aborted) {
                    this.logger.warn(
                        "Authentication cancelled - auth manager was reset or aborted"
                    );
                    return null;
                }

                if (tokenRequest) {
                    this.logger.debug("Using token request for authentication");
                    return await this.requestToken(tokenRequest);
                }

                const response = await this._authenticate();

                if (response?.tokenRequest) {
                    this.logger.debug(
                        "Received token request in response - requesting token"
                    );
                    return await this.requestToken(response.tokenRequest);
                }

                this.logger.info("Authentication successful");
                return response;
            } catch (error) {
                // Check if operation was aborted
                if (this.abortController.signal.aborted) {
                    this.logger.warn("Authentication cancelled due to abort");
                    return null;
                }

                const isLastAttempt = attempt === retries;
                this.logger.warn(
                    `Authentication attempt ${attempt + 1}/${retries + 1} failed:`,
                    error
                );

                if (isLastAttempt) {
                    this.logger.error("All authentication attempts failed");
                    return this.handleError(error, "Authentication failed");
                }

                this.logger.debug(
                    `Retrying authentication in ${retryInterval}ms`
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, retryInterval)
                );
            }
        }

        return null;
    }

    private async _authenticate(): Promise<AuthResponse | null> {
        this.logger.debug("Internal authentication started");

        const authUrl = this.optionManager.getOption("authUrl");
        const apiKey = this.optionManager.getOption("apiKey");
        const authOptions = this.optionManager.getOption("authOptions");

        this.logger.trace("Auth config:", {
            hasAuthUrl: !!authUrl,
            hasApiKey: !!apiKey,
            hasAuthOptions: !!authOptions,
        });

        if (!authUrl && !apiKey) {
            this.logger.error("No authentication credentials provided");
            return this.handleError(
                new Error("Either authUrl or apiKey must be provided"),
                "Authentication failed"
            );
        }

        if (!authUrl) {
            this.logger.debug(
                "No authUrl provided - will use apiKey for authentication"
            );
            return null; // Will use apiKey for authentication
        }

        this.logger.debug(`Sending auth request to: ${authUrl}`);

        const response = await this.httpClient.post<AuthResponse>(
            authUrl,
            authOptions?.body || {},
            {
                ...authOptions?.headers,
            }
        );

        this.logger.debug("Received auth response");

        if (response.token) {
            this.logger.debug("Response contains token - decoding and setting");
            JWT.decode(response.token);
            this.setToken(response.token);
            return response;
        }

        if (response.tokenRequest) {
            this.logger.debug("Response contains token request");
            return response;
        }

        this.logger.error("Invalid auth response - no token or tokenRequest");
        return this.handleError(
            new Error("Invalid response: expected token or tokenRequest"),
            "Authentication failed"
        );
    }

    /**
     * Check if auto authentication is enabled
     */
    public shouldAutoAuthenticate(): boolean {
        const autoAuth =
            this.optionManager.getOption("autoAuthenticate") ?? true;
        this.logger.trace(`shouldAutoAuthenticate: ${autoAuth}`);
        return autoAuth;
    }

    private setToken(token: string): void {
        this.logger.debug("Setting new token");
        this.currentToken = token;
        const decoded = JWT.decode(token);

        const expiresAt = decoded?.payload?.exp
            ? new Date(decoded.payload.exp * 1000)
            : undefined;

        if (expiresAt) {
            this.logger.info(
                `Token set - expires at ${expiresAt.toISOString()}`
            );
        } else {
            this.logger.info("Token set - no expiration");
        }

        this.logger.debug("Emitting TOKEN_UPDATED event");
        this.emit(AuthEvents.TOKEN_UPDATED, { token, expiresAt });
        this.scheduleTokenRefresh(token);
    }

    public getToken(): string | null {
        this.logger.trace("getToken called");

        if (this.currentToken && !JWT.isExpired(this.currentToken)) {
            this.logger.trace("Returning valid token");
            return this.currentToken;
        }

        if (this.currentToken) {
            this.logger.warn("Current token has expired");
            this.emit(AuthEvents.TOKEN_EXPIRED, {
                expiredAt: new Date(),
                token: this.currentToken,
            });
            this.clearToken();
        } else {
            this.logger.trace("No token available");
        }

        return null;
    }

    private scheduleTokenRefresh(token: string): void {
        this.logger.debug("Scheduling token refresh");

        if (this.refreshTimeout) {
            this.logger.debug("Clearing existing refresh timeout");
            clearTimeout(this.refreshTimeout);
        }

        try {
            const { payload } = JWT.decode(token);
            const buffer = 60000; // 1 minute buffer
            const delay = payload.exp * 1000 - Date.now() - buffer;

            if (delay > 0) {
                const refreshDate = new Date(Date.now() + delay);
                this.logger.info(
                    `Token refresh scheduled for ${refreshDate.toISOString()} (in ${Math.round(delay / 1000)}s)`
                );
                this.refreshTimeout = setTimeout(() => {
                    this.logger.info(
                        "Token refresh timer triggered - clearing token"
                    );
                    this.emit(AuthEvents.TOKEN_EXPIRED, {
                        expiredAt: new Date(),
                    });
                    this.clearToken();
                }, delay);
            } else {
                this.logger.warn(
                    `Token already expired or about to expire (delay: ${delay}ms)`
                );
                this.emit(AuthEvents.TOKEN_EXPIRED, { expiredAt: new Date() });
                this.clearToken();
            }
        } catch (error) {
            this.logger.error("Error scheduling token refresh:", error);
            this.emit(AuthEvents.TOKEN_ERROR, {
                error:
                    error instanceof Error ? error : new Error("Unknown error"),
            });
            this.clearToken();
        }
    }

    public clearToken(): void {
        this.logger.debug("Clearing token");
        this.currentToken = null;
        if (this.refreshTimeout) {
            this.logger.debug("Clearing refresh timeout");
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = undefined;
        }
        this.logger.info("Token cleared");
    }

    public getAuthHeaders(): HeadersInit {
        this.logger.trace("Getting auth headers");

        const apiKey = this.optionManager.getOption("apiKey");
        const token = this.getToken();
        const alias = this.optionManager.getOption("alias");

        if (token) {
            this.logger.debug("Using Bearer token for auth headers");
            return {
                Authorization: `Bearer ${token}`,
            };
        } else if (apiKey) {
            this.logger.debug(
                `Using Basic auth for auth headers${alias ? " with alias" : ""}`
            );
            const headers: HeadersInit = {
                Authorization: `Basic ${btoa(apiKey)}`,
            };

            // Add alias header for basic auth if provided
            if (alias) {
                headers["X-Alias"] = alias;
            }

            return headers;
        }

        this.logger.error(
            "No authentication credentials available for headers"
        );
        return this.handleError(
            new Error("No authentication credentials provided"),
            "No authentication credentials provided"
        );
    }

    public getAuthQueryParams(): string {
        this.logger.trace("Getting auth query params");

        const apiKey = this.optionManager.getOption("apiKey");
        const token = this.getToken();
        const alias = this.optionManager.getOption("alias");

        if (token) {
            this.logger.debug("Using access_token for query params");
            return `access_token=${encodeURIComponent(token)}`;
        } else if (apiKey) {
            this.logger.debug(
                `Using api_key for query params${alias ? " with alias" : ""}`
            );
            let params = `api_key=${encodeURIComponent(apiKey)}`;

            // Add alias query param for basic auth if provided
            if (alias) {
                params += `&alias=${encodeURIComponent(alias)}`;
            }

            return params;
        }

        this.logger.error(
            "No authentication credentials available for query params"
        );
        return this.handleError(
            new Error("No authentication credentials available"),
            "No authentication credentials available"
        );
    }

    public getAuthenticateUrl(baseUrl: string): string {
        this.logger.debug(`Building authenticate URL for: ${baseUrl}`);
        const authQueryParams = this.getAuthQueryParams();
        const separator = baseUrl.includes("?") ? "&" : "?";
        const url = `${baseUrl}${separator}${authQueryParams}`;
        this.logger.trace(`Authenticate URL built: ${url.substring(0, 50)}...`);
        return url;
    }

    /**
     * Generates a QPub-compatible JWT token
     * Medium-low level of security
     * Should be called from server-side only
     * Note: The permissions are not validated by the server, so make sure to set the correct permissions that align with the API key or use the issueToken method instead
     * @param options - Token options
     * @returns Promise<string> The generated JWT token
     * @throws Error if apiKey is not provided or signing fails
     */
    public async generateToken(options: TokenOptions = {}): Promise<string> {
        this.logger.debug("Generating token", options);

        const apiKey = this.optionManager.getOption("apiKey");

        if (!apiKey) {
            this.logger.error("Cannot generate token - no API key provided");
            return this.handleError(
                new Error("API key is required"),
                "Token generation failed"
            );
        }

        try {
            const { apiKeyId, secretKey } = ApiKey.parse(apiKey);
            this.logger.debug(`Parsed API key - keyId: ${apiKeyId}`);

            const expiresIn = options.expiresIn || 3600;
            const payload: JWTPayload = {
                exp: Math.floor(Date.now() / 1000) + expiresIn,
            };

            if (options.alias !== undefined) {
                payload.alias = options.alias;
                this.logger.debug(`Token alias: ${options.alias}`);
            }

            if (options.permission !== undefined) {
                payload.permission = options.permission;
                this.logger.debug("Token permission set");
            }

            this.logger.debug(`Signing token (expires in ${expiresIn}s)`);
            const token = await JWT.sign(payload, apiKeyId, secretKey);

            this.logger.info("Token generated successfully");
            return token;
        } catch (error) {
            this.logger.error("Token generation failed:", error);
            return this.handleError(error, "Token generation failed");
        }
    }

    /**
     * Issues a new JWT token from QPub server
     * Medium level of security
     * Should be called from server-side only
     * @param options - Token options
     * @returns Promise<string> The issued JWT token
     * @throws Error if apiKey is not provided or token request fails
     */
    public async issueToken(options: TokenOptions = {}): Promise<string> {
        this.logger.debug("Issuing token from QPub server", options);

        const apiKey = this.optionManager.getOption("apiKey");

        if (!apiKey) {
            this.logger.error("Cannot issue token - no API key provided");
            return this.handleError(
                new Error("API key is required for issuing tokens"),
                "Token issuance failed"
            );
        }

        try {
            const { apiKeyId } = ApiKey.parse(apiKey);
            this.logger.debug(`Parsed API key - keyId: ${apiKeyId}`);

            const host = this.optionManager.getOption("httpHost");
            const port = this.optionManager.getOption("httpPort");
            const isSecure = this.optionManager.getOption("isSecure");
            const protocol = isSecure ? "https" : "http";
            const baseUrl = `${protocol}://${host}${port ? `:${port}` : ""}/v1`;
            const url = `${baseUrl}/key/${apiKeyId}/token/issue`;

            this.logger.debug(`Issuing token from: ${url}`);

            const response = await this.httpClient.post<{ token: string }>(
                url,
                options,
                {
                    Authorization: `Basic ${btoa(apiKey)}`,
                }
            );

            if (!response.token) {
                this.logger.error("Invalid token response - no token field");
                return this.handleError(
                    new Error("Invalid token response from QPub server"),
                    "Token issuance failed"
                );
            }

            this.logger.debug("Token received - decoding to validate");
            JWT.decode(response.token);

            this.logger.info("Token issued successfully from QPub server");
            return response.token;
        } catch (error) {
            this.logger.error("Token issuance failed:", error);
            return this.handleError(error, "Token issuance failed");
        }
    }

    /**
     * Creates a token request object for client-side token requests
     * High level of security
     * Should be called from server-side only
     * @param options - Token request options
     * @returns Promise<TokenRequest> Object to be used by client for token request
     * @throws Error if apiKey is not provided or signing fails
     */
    public async createTokenRequest(
        options: TokenOptions = {}
    ): Promise<TokenRequest> {
        this.logger.debug("Creating token request", options);

        const apiKey = this.optionManager.getOption("apiKey");

        if (!apiKey) {
            this.logger.error(
                "Cannot create token request - no API key provided"
            );
            return this.handleError(
                new Error("API key is required for creating token requests"),
                "Token request creation failed"
            );
        }

        try {
            const { apiKeyId, secretKey } = ApiKey.parse(apiKey);
            this.logger.debug(`Parsed API key - keyId: ${apiKeyId}`);

            const timestamp = Math.floor(Date.now() / 1000);

            // Create signature data based on provided options
            let dataToSign = `${apiKeyId}.${timestamp}`;
            if (options.alias !== undefined) {
                dataToSign += `.${options.alias}`;
                this.logger.debug(`Token request alias: ${options.alias}`);
            }
            if (options.permission !== undefined) {
                dataToSign += `.${JSON.stringify(options.permission)}`;
                this.logger.debug("Token request permission set");
            }

            this.logger.debug("Signing token request data");
            const signature = await Crypto.hmacSign(dataToSign, secretKey);

            const request: TokenRequest = {
                kid: apiKeyId,
                timestamp,
                signature,
            };

            if (options.alias !== undefined) {
                request.alias = options.alias;
            }
            if (options.permission !== undefined) {
                request.permission = options.permission;
            }

            this.logger.info("Token request created successfully");
            return request;
        } catch (error) {
            this.logger.error("Token request creation failed:", error);
            return this.handleError(error, "Token request creation failed");
        }
    }

    /**
     * Requests a token from QPub server using a TokenRequest
     * Should be called from client-side only
     * @param request - The token request object from auth server
     * @returns Promise<AuthResponse> QPub server's response containing the token
     */
    public async requestToken(request: TokenRequest): Promise<AuthResponse> {
        this.logger.debug("Requesting token from QPub server", {
            kid: request.kid,
            hasAlias: !!request.alias,
            hasPermission: !!request.permission,
        });

        try {
            const host = this.optionManager.getOption("httpHost");
            const port = this.optionManager.getOption("httpPort");
            const isSecure = this.optionManager.getOption("isSecure");
            const protocol = isSecure ? "https" : "http";
            const baseUrl = `${protocol}://${host}${port ? `:${port}` : ""}/v1`;
            const url = `${baseUrl}/key/${request.kid}/token/request`;

            this.logger.debug(`Sending token request to: ${url}`);

            const response = await this.httpClient.post<AuthResponse>(
                url,
                request,
                {
                    "Content-Type": "application/json",
                }
            );

            if (!response.token) {
                this.logger.error("Invalid token response - no token field");
                return this.handleError(
                    new Error("Invalid response: token not found"),
                    "Token request failed"
                );
            }

            this.logger.debug("Token received - decoding and setting");
            JWT.decode(response.token);
            this.setToken(response.token);

            this.logger.info("Token request successful");
            return response;
        } catch (error) {
            this.logger.error("Token request failed:", error);
            return this.handleError(error, "Token request failed");
        }
    }

    public isAuthenticated(): boolean {
        const authenticated = this.currentToken !== null;
        this.logger.trace(`isAuthenticated: ${authenticated}`);
        return authenticated;
    }

    public getCurrentToken(): string | null {
        this.logger.trace("getCurrentToken called");
        return this.currentToken;
    }

    public reset(): void {
        this.logger.info("Resetting auth manager");

        // 1. Set reset flag to prevent new operations
        this.logger.debug("Setting reset flag");
        this._isResetting = true;

        // 2. Abort all pending operations
        this.logger.debug("Aborting pending operations");
        this.abortController.abort();

        // 3. Create new abort controller for future operations
        this.logger.debug("Creating new abort controller");
        this.abortController = new AbortController();

        // 4. Clear token and timers
        this.logger.debug("Clearing token and timers");
        this.clearToken();

        // 5. Remove all listeners
        this.logger.debug("Removing all event listeners");
        this.removeAllListeners();

        // 6. Reset the reset flag to allow new operations
        this.logger.debug("Clearing reset flag");
        this._isResetting = false;

        this.logger.info("Auth manager reset complete");
    }

    // Getter for abort signal
    public getAbortSignal(): AbortSignal {
        this.logger.trace("getAbortSignal called");
        return this.abortController.signal;
    }
}

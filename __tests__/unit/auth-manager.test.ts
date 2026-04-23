import { AuthManager } from '../../src/core/managers/auth-manager';
import { IOptionManager } from '../../src/types/services/managers';
import { IHttpClient, ILogger } from '../../src/types/services/clients';
import { AuthResponse, TokenRequest } from '../../src/types/config/auth';
import { Crypto } from '../../src/core/shared/crypto';
import { ApiKey } from '../../src/core/shared/api-key';

describe('AuthManager', () => {
    // Track AuthManager instances to clean them up
    const authManagerInstances: AuthManager[] = [];

    // Helper function to create valid JWT tokens for testing
    function createValidJWT(options: { alias?: string; permission?: any } = {}): string {
        const header = { alg: "HS256", typ: "JWT", aki: "key-1" };
        const payload: any = { 
            exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
        };
        
        // Only include alias if provided
        if (options.alias !== undefined) {
            payload.alias = options.alias;
        }
        
        // Only include permission if provided
        if (options.permission !== undefined) {
            payload.permission = options.permission;
        }
        
        const encodedHeader = btoa(JSON.stringify(header));
        const encodedPayload = btoa(JSON.stringify(payload));
        const signature = "test-signature";
        
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    // Helper function to create AuthManager and track it for cleanup
    function createAuthManager(optionManager: any, httpClient: any, logger: any): AuthManager {
        const authManager = new AuthManager(optionManager, httpClient, logger);
        authManagerInstances.push(authManager);
        return authManager;
    }

    // Clean up all AuthManager instances after each test
    afterEach(() => {
        authManagerInstances.forEach(authManager => {
            authManager.reset(); // This clears timers and event listeners
        });
        authManagerInstances.length = 0; // Clear the array
    });

    // Helper function to create manual mocks (MockFactory has issues)
    function createTestMocks(optionOverrides: any = {}) {
        const defaultOptions = {
            apiKey: undefined,
            authUrl: undefined,
            authenticateRetries: 0,
            authenticateRetryIntervalMs: 1000,
            autoAuthenticate: true,
            httpHost: 'rest.qpub.io',    // REST API host (for auth/token requests)
            httpPort: null,               // REST API port
            wsHost: 'socket.qpub.io',    // WebSocket host
            wsPort: null,                 // WebSocket port
            isSecure: true,
            tokenRequest: undefined,
            authOptions: undefined,
            ...optionOverrides
        };

        const optionManager = {
            getOption: jest.fn((key?: any) => key ? defaultOptions[key] : defaultOptions),
            setOption: jest.fn(),
            reset: jest.fn()
        } as jest.Mocked<IOptionManager>;

        const httpClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            patch: jest.fn()
        } as jest.Mocked<IHttpClient>;

        const logger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn()
        } as jest.Mocked<ILogger>;

        return { optionManager, httpClient, logger };
    }

    describe('API Key Authentication', () => {
        it('should return null for API key authentication (no token needed)', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                apiKey: 'test-api-key'
            });

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const result = await authManager.authenticate();
            
            expect(result).toBeNull();
            expect(httpClient.post).not.toHaveBeenCalled();
            expect(authManager.isAuthenticated()).toBe(false); // API key doesn't set token
        });

        it('should provide API key in URL generation', () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                apiKey: 'test-api-key'
            });

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const baseUrl = 'ws://localhost:8080/v1';
            const authenticatedUrl = authManager.getAuthenticateUrl(baseUrl);
            
            expect(authenticatedUrl).toBe('ws://localhost:8080/v1?api_key=test-api-key');
        });
    });

    describe('Auth URL Authentication', () => {
        it('should authenticate with auth URL and set token', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token',
                authOptions: {
                    body: { userId: 'test-user' },
                    headers: { 'Custom-Header': 'test' }
                }
            });

            const mockResponse: AuthResponse = {
                token: createValidJWT()
            };
            httpClient.post.mockResolvedValue(mockResponse);

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const result = await authManager.authenticate();

            expect(httpClient.post).toHaveBeenCalledWith(
                'https://auth.example.com/token',
                { userId: 'test-user' },
                { 'Custom-Header': 'test' }
            );
            expect(result).toBe(mockResponse);
            expect(authManager.isAuthenticated()).toBe(true);
            expect(authManager.getCurrentToken()).toBe(mockResponse.token);
        });

        it('should handle token request response flow', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token',
                httpHost: 'api.example.com',  // Correct: REST API host for token requests
                httpPort: 443,                // Correct: REST API port for token requests
                isSecure: true
            });

            const tokenRequest: TokenRequest = {
                aki: 'key-1',
                signature: 'test-signature',
                timestamp: Date.now()
            };
            const mockAuthResponse: AuthResponse = { tokenRequest };
            const mockTokenResponse: AuthResponse = {
                token: createValidJWT()
            };

            httpClient.post
                .mockResolvedValueOnce(mockAuthResponse) // First call returns token request
                .mockResolvedValueOnce(mockTokenResponse); // Second call returns token

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const result = await authManager.authenticate();

            expect(httpClient.post).toHaveBeenCalledTimes(2);
            expect(httpClient.post).toHaveBeenNthCalledWith(2,
                'https://api.example.com:443/v1/key/key-1/token/request',
                tokenRequest,
                { 'Content-Type': 'application/json' }
            );
            expect(result).toBe(mockTokenResponse);
            expect(authManager.isAuthenticated()).toBe(true);
        });

        it('should throw error for invalid auth response', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token'
            });

            httpClient.post.mockResolvedValue({}); // Invalid response

            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.authenticate()).rejects.toThrow(
                'Invalid response: expected token or tokenRequest'
            );
        });
    });

    describe('Token Request Flow', () => {
        it('should issue token using only apiKeyPublicId in URL', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                apiKey: 'key-1:secret-1',
                httpHost: 'api.example.com',
                httpPort: 443,
                isSecure: true
            });

            httpClient.post.mockResolvedValue({ token: createValidJWT() });

            const authManager = createAuthManager(optionManager, httpClient, logger);
            await authManager.issueToken();

            expect(httpClient.post).toHaveBeenCalledWith(
                'https://api.example.com:443/v1/key/key-1/token/issue',
                {},
                {
                    Authorization: `Basic ${btoa('key-1:secret-1')}`,
                }
            );
        });

        it('should request token successfully', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                httpHost: 'api.example.com',  // Correct: REST API host for token requests
                httpPort: 443,                // Correct: REST API port for token requests
                isSecure: true
            });

            const tokenRequest: TokenRequest = {
                aki: 'key-1',
                signature: 'test-signature',
                timestamp: Date.now()
            };
            const mockResponse: AuthResponse = {
                token: createValidJWT()
            };
            httpClient.post.mockResolvedValue(mockResponse);

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const result = await authManager.requestToken(tokenRequest);

            expect(httpClient.post).toHaveBeenCalledWith(
                'https://api.example.com:443/v1/key/key-1/token/request',
                tokenRequest,
                { 'Content-Type': 'application/json' }
            );
            expect(result).toBe(mockResponse);
            expect(authManager.isAuthenticated()).toBe(true);
        });

        it('should fail when aki is missing', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                httpHost: 'api.example.com',
                httpPort: 443,
                isSecure: true
            });

            const tokenRequest: TokenRequest = {
                aki: '',
                signature: 'test-signature',
                timestamp: Date.now()
            };

            const authManager = createAuthManager(optionManager, httpClient, logger);
            await expect(authManager.requestToken(tokenRequest)).rejects.toThrow(
                'Invalid token request: aki is required'
            );
            expect(httpClient.post).not.toHaveBeenCalled();
        });

        it('should handle token request errors', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                httpHost: 'api.example.com',  // Correct: REST API host for token requests
                httpPort: 443,                // Correct: REST API port for token requests
                isSecure: true
            });

            const tokenRequest: TokenRequest = {
                aki: 'key-1',
                signature: 'test-signature',
                timestamp: Date.now()
            };
            httpClient.post.mockRejectedValue(new Error('Network error'));

            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.requestToken(tokenRequest)).rejects.toThrow('Network error');
        });
    });

    describe('Generate Token (JWT.sign)', () => {
        it('should generate a JWT token using apiKeyPublicId and apiKeySecret', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                apiKey: 'key-1:secret-1',
            });
            const hmacSpy = jest
                .spyOn(Crypto, 'hmacSign')
                .mockResolvedValue(Buffer.from('signature-bytes').toString('base64'));

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const token = await authManager.generateToken({
                expiresIn: 7200,
                alias: 'user-1',
                permission: { 'room.*': ['subscribe'] },
            });

            expect(hmacSpy).toHaveBeenCalledTimes(1);
            expect(hmacSpy.mock.calls[0][1]).toBe('secret-1');

            const [headerB64, payloadB64] = token.split('.');
            const header = JSON.parse(
                Buffer.from(headerB64, 'base64').toString('utf-8')
            );
            const payload = JSON.parse(
                Buffer.from(payloadB64, 'base64').toString('utf-8')
            );

            expect(header).toEqual({ alg: 'HS256', typ: 'JWT', aki: 'key-1' });
            expect(payload.alias).toBe('user-1');
            expect(payload.permission).toEqual({ 'room.*': ['subscribe'] });
            expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

            hmacSpy.mockRestore();
        });

        it('should fail generateToken when no apiKey is provided', async () => {
            const { optionManager, httpClient, logger } = createTestMocks();
            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.generateToken()).rejects.toThrow(
                'API key is required'
            );
        });

        it('should propagate signing errors from JWT.sign', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                apiKey: 'key-1:secret-1',
            });
            const hmacSpy = jest
                .spyOn(Crypto, 'hmacSign')
                .mockRejectedValue(new Error('crypto down'));

            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.generateToken()).rejects.toThrow(
                /Failed to sign JWT: crypto down/
            );

            hmacSpy.mockRestore();
        });
    });

    describe('API Key Parser and Canonical Signing', () => {
        it('should parse api key credential in vNext format', () => {
            expect(ApiKey.parse('key-1:secret-1')).toEqual({
                apiKeyPublicId: 'key-1',
                apiKeySecret: 'secret-1',
            });
        });

        it('should reject malformed api key credentials', () => {
            expect(() => ApiKey.parse('key-1')).toThrow('Invalid API key credential format');
            expect(() => ApiKey.parse('key-1:secret-1:extra')).toThrow('Invalid API key credential format');
            expect(() => ApiKey.parse(':secret-1')).toThrow('Invalid API key credential format');
        });

        it('should sign canonical token request payload without signature', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                apiKey: 'key-1:secret-1',
            });
            const hmacSpy = jest.spyOn(Crypto, 'hmacSign').mockResolvedValue('sig');

            const authManager = createAuthManager(optionManager, httpClient, logger);
            await authManager.createTokenRequest({
                alias: 'client-1',
                permission: { 'room.*': ['subscribe'] },
            });

            expect(hmacSpy).toHaveBeenCalledTimes(1);
            const canonical = hmacSpy.mock.calls[0][0] as string;
            expect(canonical).toMatch(
                /^aki=key-1\ntimestamp=\d+\nalias=client-1\npermission=\{"room\.\*":\["subscribe"\]\}$/
            );

            hmacSpy.mockRestore();
        });
    });

    describe('Retry Logic', () => {
        it('should retry authentication on failure', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token',
                authenticateRetries: 2,
                authenticateRetryIntervalMs: 50 // Short for testing
            });

            const mockResponse: AuthResponse = {
                token: createValidJWT()
            };

            httpClient.post
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Server error'))
                .mockResolvedValueOnce(mockResponse); // Success on third attempt

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const start = Date.now();
            const result = await authManager.authenticate();
            const duration = Date.now() - start;

            expect(httpClient.post).toHaveBeenCalledTimes(3);
            expect(result).toBe(mockResponse);
            expect(authManager.isAuthenticated()).toBe(true);
            expect(duration).toBeGreaterThanOrEqual(100); // At least 2 retry intervals
        });

        it('should fail after max retries exceeded', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token',
                authenticateRetries: 2,
                authenticateRetryIntervalMs: 10
            });

            httpClient.post.mockRejectedValue(new Error('Persistent error'));

            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.authenticate()).rejects.toThrow('Persistent error');
            expect(httpClient.post).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });

    describe('Authentication State Management', () => {
        it('should track authentication state correctly', () => {
            const { optionManager, httpClient, logger } = createTestMocks();
            const authManager = createAuthManager(optionManager, httpClient, logger);

            expect(authManager.isAuthenticated()).toBe(false);
            expect(authManager.getCurrentToken()).toBeNull();
            expect(authManager.getToken()).toBeNull();
        });

        it('should provide authentication headers when authenticated', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token'
            });

            const mockResponse: AuthResponse = {
                token: createValidJWT()
            };
            httpClient.post.mockResolvedValue(mockResponse);

            const authManager = createAuthManager(optionManager, httpClient, logger);
            await authManager.authenticate();

            const headers = authManager.getAuthHeaders();
            expect(headers).toEqual({
                'Authorization': `Bearer ${mockResponse.token}`
            });
        });

        it('should clear token and reset state', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token'
            });

            const mockResponse: AuthResponse = {
                token: createValidJWT()
            };
            httpClient.post.mockResolvedValue(mockResponse);

            const authManager = createAuthManager(optionManager, httpClient, logger);
            await authManager.authenticate();
            expect(authManager.isAuthenticated()).toBe(true);

            authManager.clearToken();
            expect(authManager.isAuthenticated()).toBe(false);
            expect(authManager.getCurrentToken()).toBeNull();
        });
    });

    describe('Auto Authentication', () => {
        it('should check auto authentication setting', () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                autoAuthenticate: true
            });
            const authManager = createAuthManager(optionManager, httpClient, logger);
            expect(authManager.shouldAutoAuthenticate()).toBe(true);

            const { optionManager: optionManager2, httpClient: httpClient2, logger: logger2 } = createTestMocks({
                autoAuthenticate: false
            });
            const authManager2 = new AuthManager(optionManager2, httpClient2, logger2);
            expect(authManager2.shouldAutoAuthenticate()).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should throw error when no auth credentials provided', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: undefined,
                apiKey: undefined
            });

            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.authenticate()).rejects.toThrow(
                'Either authUrl or apiKey must be provided'
            );
        });

        it('should handle HTTP client errors gracefully', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token'
            });

            const networkError = new Error('Connection timeout');
            httpClient.post.mockRejectedValue(networkError);

            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.authenticate()).rejects.toThrow('Connection timeout');
        });

        it('should handle malformed JWT tokens', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token'
            });

            const mockResponse: AuthResponse = {
                token: 'invalid-jwt-token'
            };
            httpClient.post.mockResolvedValue(mockResponse);

            const authManager = createAuthManager(optionManager, httpClient, logger);

            await expect(authManager.authenticate()).rejects.toThrow();
        });

        it('should accept tokens without alias field', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token'
            });

            // Create token without alias field
            const mockResponse: AuthResponse = {
                token: createValidJWT() // No alias provided
            };
            httpClient.post.mockResolvedValue(mockResponse);

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const result = await authManager.authenticate();

            expect(result).toBe(mockResponse);
            expect(authManager.isAuthenticated()).toBe(true);
            expect(authManager.getCurrentToken()).toBe(mockResponse.token);
        });

        it('should accept tokens without permission field', async () => {
            const { optionManager, httpClient, logger } = createTestMocks({
                authUrl: 'https://auth.example.com/token'
            });

            // Create token with alias but without permission
            const mockResponse: AuthResponse = {
                token: createValidJWT({ alias: 'test-user' }) // No permission provided
            };
            httpClient.post.mockResolvedValue(mockResponse);

            const authManager = createAuthManager(optionManager, httpClient, logger);
            const result = await authManager.authenticate();

            expect(result).toBe(mockResponse);
            expect(authManager.isAuthenticated()).toBe(true);
        });
    });
});
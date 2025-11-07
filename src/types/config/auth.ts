/**
 * Authentication Configuration
 * 
 * Types for authentication, tokens, and JWT handling.
 */

/**
 * Permission map for resource access control
 * 
 * @example
 * ```typescript
 * {
 *   "flights.*": ["publish"],
 *   "users.123.*": ["subscribe", "publish"],
 *   "*": ["subscribe"]
 * }
 * ```
 */
export interface Permission {
    [resourcePattern: string]: string[];
}

/**
 * JWT Header structure
 */
export interface JWTHeader {
    alg: string;
    typ: string;
    aki: string;
}

/**
 * JWT Payload structure
 */
export interface JWTPayload {
    alias?: string;
    permission?: Permission;
    exp: number;
}

/**
 * Options for token generation
 */
export interface TokenOptions {
    /** Resource access permission map (e.g., "flights.*": ["publish"]) */
    permission?: Permission;
    /** Client identifier (e.g., user ID, session ID) */
    alias?: string;
    /** Token expiration time in seconds (default: 3600) */
    expiresIn?: number;
}

/**
 * Token request structure sent to authentication server
 */
export interface TokenRequest {
    aki: string; // API Key ID
    permission?: Permission; // Permission map
    alias?: string; // Client identifier
    timestamp: number; // Request timestamp
    signature: string; // Request signature
}

/**
 * Response from authentication server
 */
export interface AuthResponse {
    token?: string; // Direct token response
    tokenRequest?: TokenRequest; // Or token request object
    [key: string]: any; // Additional response data
}


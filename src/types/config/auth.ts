/**
 * Authentication Configuration
 * 
 * Types for authentication, tokens, and JWT handling.
 */

interface Permissions {
    [resource: string]: string[];
}

/**
 * JWT Header structure
 */
export interface JWTHeader {
    alg: string;
    typ: string;
    kid: string;
}

/**
 * JWT Payload structure
 */
export interface JWTPayload {
    alias?: string;
    permissions?: Permissions;
    exp: number;
}

/**
 * Options for token generation
 */
export interface TokenOptions {
    permissions?: Permissions; // Permissions
    alias?: string; // Client identifier
    expiresIn?: number; // Token expiration in seconds
}

/**
 * Token request structure sent to authentication server
 */
export interface TokenRequest {
    kid: string; // API Key ID
    permissions?: Permissions; // Permissions
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


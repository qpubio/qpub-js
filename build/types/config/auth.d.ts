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
    permissions?: Permissions;
    alias?: string;
    expiresIn?: number;
}
/**
 * Token request structure sent to authentication server
 */
export interface TokenRequest {
    kid: string;
    permissions?: Permissions;
    alias?: string;
    timestamp: number;
    signature: string;
}
/**
 * Response from authentication server
 */
export interface AuthResponse {
    token?: string;
    tokenRequest?: TokenRequest;
    [key: string]: any;
}
export {};
//# sourceMappingURL=auth.d.ts.map
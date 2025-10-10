interface Permissions {
    [resource: string]: string[];
}

export interface TokenOptions {
    permissions?: Permissions; // Permissions
    alias?: string; // Client identifier
    expiresIn?: number; // Token expiration in seconds
}

export interface TokenRequest {
    kid: string; // API Key ID
    permissions?: Permissions; // Permissions
    alias?: string; // Client identifier
    timestamp: number; // Request timestamp
    signature: string; // Request signature
}

export interface AuthResponse {
    token?: string; // Direct token response
    tokenRequest?: TokenRequest; // Or token request object
    [key: string]: any; // Additional response data
}

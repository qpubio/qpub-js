interface Permissions {
    [resource: string]: string[];
}

export interface JWTHeader {
    alg: string;
    typ: string;
    kid: string;
}

export interface JWTPayload {
    alias?: string;
    permissions?: Permissions;
    exp: number;
}

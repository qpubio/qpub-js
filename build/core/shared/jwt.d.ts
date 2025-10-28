import { JWTHeader, JWTPayload } from "../../types/config/auth";
export declare class JWT {
    static decode(token: string): {
        header: JWTHeader;
        payload: JWTPayload;
    };
    static isExpired(token: string): boolean;
    static sign(payload: JWTPayload, apiKeyId: string, privateKey: string): Promise<string>;
    private static base64UrlEncode;
    private static base64Decode;
}
//# sourceMappingURL=jwt.d.ts.map
import { JWTHeader, JWTPayload } from "../../types/config/auth";
import { Crypto } from "./crypto";

export class JWT {
    static decode(token: string): { header: JWTHeader; payload: JWTPayload } {
        try {
            const [headerB64, payloadB64] = token.split(".");

            const header = JSON.parse(atob(headerB64)) as JWTHeader;
            const payload = JSON.parse(atob(payloadB64)) as JWTPayload;

            // Validate required fields
            if (!header.kid || !payload.alias || !payload.exp) {
                throw new Error("Missing required JWT fields");
            }

            return { header, payload };
        } catch (e) {
            throw new Error("Invalid JWT format");
        }
    }

    static isExpired(token: string): boolean {
        try {
            const { payload } = this.decode(token);
            return payload.exp * 1000 <= Date.now();
        } catch {
            return true;
        }
    }

    static async sign(
        payload: JWTPayload,
        apiKeyId: string,
        privateKey: string
    ): Promise<string> {
        try {
            const header: JWTHeader = {
                alg: "HS256",
                typ: "JWT",
                kid: apiKeyId,
            };

            // Base64Url encode header and payload
            const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
            const encodedPayload = this.base64UrlEncode(
                JSON.stringify(payload)
            );

            // Create signature
            const dataToSign = `${encodedHeader}.${encodedPayload}`;
            const signature = await Crypto.hmacSign(dataToSign, privateKey);
            const encodedSignature = this.base64UrlEncode(
                this.base64Decode(signature)
            );

            return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
        } catch (error) {
            throw new Error(
                `Failed to sign JWT: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    private static base64UrlEncode(str: string): string {
        return btoa(str)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    private static base64Decode(str: string): string {
        return atob(str);
    }
}

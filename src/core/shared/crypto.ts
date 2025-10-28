export class Crypto {
    private static async getSubtleCrypto(): Promise<SubtleCrypto> {
        if (typeof window !== "undefined" && window.crypto) {
            return window.crypto.subtle;
        }

        if (typeof global !== "undefined") {
            try {
                // Node.js v19+ has global.crypto
                const crypto = (global as any).crypto;
                if (crypto?.subtle) {
                    return crypto.subtle;
                }

                // Older Node.js versions
                const nodeCrypto = require("crypto").webcrypto;
                return nodeCrypto.subtle;
            } catch {
                throw new Error("Crypto is not supported in this environment");
            }
        }

        throw new Error("Crypto is not supported in this environment");
    }

    static async hmacSign(data: string, key: string): Promise<string> {
        try {
            const subtle = await this.getSubtleCrypto();

            // Convert key to raw bytes
            const encoder = new TextEncoder();
            const keyBytes = encoder.encode(key);
            const dataBytes = encoder.encode(data);

            // Import key
            const cryptoKey = await subtle.importKey(
                "raw",
                keyBytes,
                {
                    name: "HMAC",
                    hash: { name: "SHA-256" },
                },
                false,
                ["sign"]
            );

            // Sign data
            const signature = await subtle.sign("HMAC", cryptoKey, dataBytes);

            // Convert signature to base64
            return this.arrayBufferToBase64(signature);
        } catch (error) {
            throw new Error(
                `Signing failed: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    private static arrayBufferToBase64(buffer: ArrayBuffer): string {
        if (typeof window !== "undefined") {
            // Browser
            const bytes = new Uint8Array(buffer);
            const binary = bytes.reduce(
                (str, byte) => str + String.fromCharCode(byte),
                ""
            );
            return btoa(binary);
        } else {
            // Node.js
            return Buffer.from(buffer).toString("base64");
        }
    }
}

export class ApiKey {
    static parse(apiKey: string): { apiKeyId: string; secretKey: string } {
        const [apiKeyId, secretKey] = apiKey.split(":");
        if (!apiKeyId || !secretKey) {
            throw new Error("Invalid API key format");
        }
        return { apiKeyId, secretKey };
    }
}

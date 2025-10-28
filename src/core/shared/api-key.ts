export class ApiKey {
    static parse(apiKey: string): { apiKeyId: string; privateKey: string } {
        const [apiKeyId, privateKey] = apiKey.split(":");
        if (!apiKeyId || !privateKey) {
            throw new Error("Invalid API key format");
        }
        return { apiKeyId, privateKey };
    }
}

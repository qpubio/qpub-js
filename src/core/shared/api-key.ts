export class ApiKey {
    static parse(apiKeyCredential: string): {
        apiKeyPublicId: string;
        apiKeySecret: string;
    } {
        const separatorIndex = apiKeyCredential.indexOf(":");
        if (
            separatorIndex <= 0 ||
            separatorIndex !== apiKeyCredential.lastIndexOf(":") ||
            separatorIndex === apiKeyCredential.length - 1
        ) {
            throw new Error("Invalid API key credential format");
        }

        const apiKeyPublicId = apiKeyCredential.slice(0, separatorIndex);
        const apiKeySecret = apiKeyCredential.slice(separatorIndex + 1);

        return {
            apiKeyPublicId,
            apiKeySecret,
        };
    }
}

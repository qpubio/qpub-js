import { IOptionManager } from "../../types/services/managers";

export function buildRestBaseUrl(optionManager: IOptionManager): string {
    const host = optionManager.getOption("httpHost");
    const port = optionManager.getOption("httpPort");
    const isSecure = optionManager.getOption("isSecure");
    const protocol = isSecure ? "https" : "http";
    return `${protocol}://${host}${port ? `:${port}` : ""}/v1`;
}

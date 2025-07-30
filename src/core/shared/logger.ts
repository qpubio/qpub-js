import { IOptionManager, ILogger } from "../../interfaces/services.interface";

export class Logger implements ILogger {
    private instanceId: string;
    private component: string;
    private optionManager: IOptionManager;

    constructor(instanceId: string, component: string, optionManager: IOptionManager) {
        this.instanceId = instanceId;
        this.component = component;
        this.optionManager = optionManager;
    }

    private shouldLog(level: string): boolean {
        const debug = this.optionManager.getOption("debug");
        if (!debug) return false;

        const logLevel = this.optionManager.getOption("logLevel");
        const levels = ["error", "warn", "info", "debug", "trace"];
        return levels.indexOf(level) <= levels.indexOf(logLevel || "error");
    }

    private formatMessage(
        level: string,
        message: string,
        ...args: any[]
    ): string {
        const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
        const shortId = this.instanceId.slice(-8);

        const formattedMessage =
            args.length > 0 ? `${message} ${args.join(" ")}` : message;

        return `${timestamp} [${level.toUpperCase()}] [${
            this.component
        }:${shortId}] ${formattedMessage}`;
    }

    private log(level: string, message: string, ...args: any[]): void {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, ...args);
        const customLogger = this.optionManager.getOption("logger");

        if (customLogger) {
            customLogger(level, formattedMessage, ...args);
            return;
        }

        switch (level) {
            case "error":
                console.error(formattedMessage, ...args);
                break;
            case "warn":
                console.warn(formattedMessage, ...args);
                break;
            case "info":
                console.info(formattedMessage, ...args);
                break;
            case "debug":
                console.log(formattedMessage, ...args);
                break;
            case "trace":
                console.trace(formattedMessage, ...args);
                break;
        }
    }

    public error(message: string, ...args: any[]): void {
        this.log("error", message, ...args);
    }

    public warn(message: string, ...args: any[]): void {
        this.log("warn", message, ...args);
    }

    public info(message: string, ...args: any[]): void {
        this.log("info", message, ...args);
    }

    public debug(message: string, ...args: any[]): void {
        this.log("debug", message, ...args);
    }

    public trace(message: string, ...args: any[]): void {
        this.log("trace", message, ...args);
    }
}

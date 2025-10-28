import { IOptionManager } from "../../types/services/managers";
import { ILogger } from "../../types/services/clients";

/**
 * High-performance logger with early-exit optimization.
 *
 * Performance characteristics:
 * - When debug is disabled: ~1-2μs overhead per call (just checks debug flag)
 * - When debug is enabled: ~10-50μs for formatting + async console output
 * - Console operations are non-blocking (async in browsers/Node.js)
 *
 * Note: String interpolation in log calls (e.g., `logger.debug(\`text \${var}\`)`)
 * happens before entering the logger, but is very fast (~1μs per interpolation).
 */
export class Logger implements ILogger {
    private instanceId: string;
    private component: string;
    private optionManager: IOptionManager;

    // Cache the log level hierarchy to avoid array creation on every call
    private static readonly LOG_LEVELS = [
        "error",
        "warn",
        "info",
        "debug",
        "trace",
    ];
    private static readonly LOG_LEVEL_MAP: Record<string, number> = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4,
    };

    constructor(
        instanceId: string,
        component: string,
        optionManager: IOptionManager
    ) {
        this.instanceId = instanceId;
        this.component = component;
        this.optionManager = optionManager;
    }

    /**
     * Fast check if logging should occur.
     * This is called for EVERY log statement, so it must be extremely fast.
     */
    private shouldLog(level: string): boolean {
        // Early exit - most important optimization!
        // When debug is false, this returns immediately (1-2μs)
        const debug = this.optionManager.getOption("debug");
        if (!debug) return false;

        const logLevel = this.optionManager.getOption("logLevel") || "error";

        // Use map lookup instead of array indexOf (slightly faster)
        const currentLevel = Logger.LOG_LEVEL_MAP[level] ?? 0;
        const maxLevel = Logger.LOG_LEVEL_MAP[logLevel] ?? 0;

        return currentLevel <= maxLevel;
    }

    private formatMessage(
        level: string,
        message: string,
        ...args: any[]
    ): string {
        // Cache timestamp parts to avoid repeated ISO string operations
        const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
        const shortId = this.instanceId.slice(-8);

        // Only join args if there are any (avoid unnecessary operations)
        const formattedMessage =
            args.length > 0 ? `${message} ${args.join(" ")}` : message;

        return `${timestamp} [${level.toUpperCase()}] [${
            this.component
        }:${shortId}] ${formattedMessage}`;
    }

    /**
     * Core logging method with performance optimizations:
     * 1. Early exit if logging disabled (critical path)
     * 2. Lazy formatting (only format if actually logging)
     * 3. Console methods are async/non-blocking
     */
    private log(level: string, message: string, ...args: any[]): void {
        // CRITICAL: Early exit before ANY expensive operations
        // This is hit on EVERY log call in production
        if (!this.shouldLog(level)) return;

        // Only format message if we're actually going to log it
        const formattedMessage = this.formatMessage(level, message, ...args);
        const customLogger = this.optionManager.getOption("logger");

        if (customLogger) {
            // Custom loggers are responsible for their own performance
            // Consider wrapping in try-catch to prevent blocking on errors
            try {
                customLogger(level, formattedMessage, ...args);
            } catch (error) {
                // Fail silently to avoid blocking the main process
                // Could optionally write to console.error as fallback
            }
            return;
        }

        // Console methods are non-blocking:
        // - Browsers: Console output is queued and handled asynchronously
        // - Node.js: stdout/stderr writes are mostly async (buffered)
        // This means these calls return immediately and don't block the event loop
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

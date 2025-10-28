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
export declare class Logger implements ILogger {
    private instanceId;
    private component;
    private optionManager;
    private static readonly LOG_LEVELS;
    private static readonly LOG_LEVEL_MAP;
    constructor(instanceId: string, component: string, optionManager: IOptionManager);
    /**
     * Fast check if logging should occur.
     * This is called for EVERY log statement, so it must be extremely fast.
     */
    private shouldLog;
    private formatMessage;
    /**
     * Core logging method with performance optimizations:
     * 1. Early exit if logging disabled (critical path)
     * 2. Lazy formatting (only format if actually logging)
     * 3. Console methods are async/non-blocking
     */
    private log;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    trace(message: string, ...args: any[]): void;
}
//# sourceMappingURL=logger.d.ts.map
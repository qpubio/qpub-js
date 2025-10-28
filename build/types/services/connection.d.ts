/**
 * Connection Service Interface
 *
 * Interface for connection management.
 */
import { EventEmitter } from "../../core/shared/event-emitter";
import { ConnectionEventPayloads } from "../events/payloads";
/**
 * Interface for connection management
 */
export interface IConnection extends EventEmitter<ConnectionEventPayloads> {
    /**
     * Connect to the server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the server
     */
    disconnect(): void;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Send a ping to the server and measure round-trip time
     * @returns Promise that resolves with RTT in milliseconds
     */
    ping(): Promise<number>;
    /**
     * Reset the connection
     */
    reset(): void;
    /**
     * Check if connection is currently resetting
     */
    isResetting(): boolean;
}
//# sourceMappingURL=connection.d.ts.map
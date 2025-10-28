/**
 * Types Module
 * 
 * Central export point for all types organized by domain:
 * - Protocol: WebSocket protocol actions and messages
 * - Events: Event constants, payloads, and listeners
 * - Config: SDK configuration and authentication options
 * - Services: Service interfaces for managers, clients, and channels
 */

// Protocol types (actions and messages)
export * from "./protocol";

// Event types (constants, payloads, listeners)
export * from "./events";

// Configuration types (options and auth)
export * from "./config";

// Service interfaces (managers, clients, channels)
export * from "./services";


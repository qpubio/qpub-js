/**
 * Generate a UUID v7 for client-side instance identification.
 * This implementation is designed for generating unique identifiers within a single runtime instance
 * (browser session or Node.js process), specifically for Socket and Rest class instances.
 * It combines timestamp and random values to ensure uniqueness within the same runtime.
 *
 * This implementation is platform-agnostic and works in both browser and Node.js environments
 * as it only uses standard JavaScript APIs (Date.now() and Math.random()).
 *
 * Note: This is NOT a cryptographically secure implementation and should not be used
 * for security-sensitive purposes or when cross-instance uniqueness is required.
 *
 * @returns UUID v7 string formatted as: timestamp-timestamp-variant-random-random
 */
export declare function uuidv7(): string;
//# sourceMappingURL=uuid.d.ts.map
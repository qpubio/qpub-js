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
export function uuidv7(): string {
    const timestamp = BigInt(Date.now());
    const timestampHex = timestamp.toString(16).padStart(12, "0");

    // Generate 20 random hex characters (10 bytes)
    const randomHex = Array.from({ length: 20 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join("");

    return `${timestampHex.slice(0, 8)}-${timestampHex.slice(
        8,
        12
    )}-7${randomHex.slice(0, 3)}-${(
        8 +
        (parseInt(randomHex[0], 16) & 0x3)
    ).toString(16)}${randomHex.slice(3, 6)}-${randomHex.slice(6, 16)}`;
}

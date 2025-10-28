/**
 * Service lifetime options for dependency injection
 */
export type ServiceLifetime = "singleton" | "transient";
/**
 * Options for service registration
 */
export interface ServiceRegistrationOptions {
    /** Service lifetime - defaults to 'singleton' */
    lifetime?: ServiceLifetime;
    /** List of service keys this service depends on */
    dependencies?: string[];
}
/**
 * Type-safe dependency injection container
 *
 * Manages service registration, resolution, and lifecycle for a specific instance.
 * Each Socket/Rest instance gets its own container for complete isolation.
 */
export declare class ServiceContainer {
    private readonly definitions;
    private readonly instances;
    private readonly instanceId;
    private readonly resolutionStack;
    constructor(instanceId: string);
    /**
     * Register a service in the container
     *
     * @param key - Unique identifier for the service
     * @param factory - Function that creates the service instance
     * @param options - Registration options (lifetime, dependencies)
     */
    register<T>(key: string, factory: (container: ServiceContainer) => T, options?: ServiceRegistrationOptions): void;
    /**
     * Resolve a service from the container
     *
     * @param key - Service identifier to resolve
     * @returns The service instance
     */
    resolve<T>(key: string): T;
    /**
     * Check if a service is registered
     *
     * @param key - Service identifier to check
     * @returns True if the service is registered
     */
    isRegistered(key: string): boolean;
    /**
     * Check if a service has been instantiated (for singletons)
     *
     * @param key - Service identifier to check
     * @returns True if the service instance exists
     */
    isInstantiated(key: string): boolean;
    /**
     * Get list of all registered service keys
     */
    getRegisteredServices(): string[];
    /**
     * Get the instance ID for this container
     */
    getInstanceId(): string;
    /**
     * Validate all registered services and their dependencies
     *
     * @throws Error if any dependencies are missing or circular
     */
    validate(): void;
    /**
     * Validate circular dependencies using topological sort without instantiating services
     */
    private validateCircularDependencies;
    /**
     * Clear all cached singleton instances
     * Useful for testing or cleanup scenarios
     */
    clearInstances(): void;
    /**
     * Reset the entire container (clear definitions and instances)
     */
    reset(): void;
}
//# sourceMappingURL=container.d.ts.map
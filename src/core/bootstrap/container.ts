/**
 * Service lifetime options for dependency injection
 */
export type ServiceLifetime = "singleton" | "transient";

/**
 * Definition of a service in the container
 */
interface ServiceDefinition<T = any> {
    /** Factory function to create the service instance */
    factory: (container: ServiceContainer) => T;
    /** Service lifetime - singleton (cached) or transient (new instance each time) */
    lifetime: ServiceLifetime;
    /** List of service keys this service depends on (for validation) */
    dependencies?: string[];
}

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
export class ServiceContainer {
    private readonly definitions = new Map<string, ServiceDefinition>();
    private readonly instances = new Map<string, any>();
    private readonly instanceId: string;
    private readonly resolutionStack: string[] = [];

    constructor(instanceId: string) {
        this.instanceId = instanceId;
    }

    /**
     * Register a service in the container
     *
     * @param key - Unique identifier for the service
     * @param factory - Function that creates the service instance
     * @param options - Registration options (lifetime, dependencies)
     */
    register<T>(
        key: string,
        factory: (container: ServiceContainer) => T,
        options: ServiceRegistrationOptions = {}
    ): void {
        if (this.definitions.has(key)) {
            throw new Error(
                `Service '${key}' is already registered in container '${this.instanceId}'`
            );
        }

        this.definitions.set(key, {
            factory,
            lifetime: options.lifetime ?? "singleton",
            dependencies: options.dependencies ?? [],
        });
    }

    /**
     * Resolve a service from the container
     *
     * @param key - Service identifier to resolve
     * @returns The service instance
     */
    resolve<T>(key: string): T {
        // Check for circular dependencies
        if (this.resolutionStack.includes(key)) {
            const cycle = [...this.resolutionStack, key].join(" -> ");
            throw new Error(
                `Circular dependency detected in container '${this.instanceId}': ${cycle}`
            );
        }

        // Return existing singleton instance if available
        if (this.instances.has(key)) {
            return this.instances.get(key);
        }

        // Get service definition
        const definition = this.definitions.get(key);
        if (!definition) {
            throw new Error(
                `Service '${key}' not found in container '${this.instanceId}'. ` +
                    `Available services: ${Array.from(
                        this.definitions.keys()
                    ).join(", ")}`
            );
        }

        // Add to resolution stack for circular dependency detection
        this.resolutionStack.push(key);

        try {
            // Create the service instance
            const instance = definition.factory(this);

            // Cache singleton instances
            if (definition.lifetime === "singleton") {
                this.instances.set(key, instance);
            }

            return instance;
        } catch (error) {
            throw new Error(
                `Failed to resolve service '${key}' in container '${
                    this.instanceId
                }': ${error instanceof Error ? error.message : String(error)}`
            );
        } finally {
            // Remove from resolution stack
            this.resolutionStack.pop();
        }
    }

    /**
     * Check if a service is registered
     *
     * @param key - Service identifier to check
     * @returns True if the service is registered
     */
    isRegistered(key: string): boolean {
        return this.definitions.has(key);
    }

    /**
     * Check if a service has been instantiated (for singletons)
     *
     * @param key - Service identifier to check
     * @returns True if the service instance exists
     */
    isInstantiated(key: string): boolean {
        return this.instances.has(key);
    }

    /**
     * Get list of all registered service keys
     */
    getRegisteredServices(): string[] {
        return Array.from(this.definitions.keys());
    }

    /**
     * Get the instance ID for this container
     */
    getInstanceId(): string {
        return this.instanceId;
    }

    /**
     * Validate all registered services and their dependencies
     *
     * @throws Error if any dependencies are missing or circular
     */
    validate(): void {
        const allServices = new Set(this.definitions.keys());

        // Check if all dependencies are registered
        Array.from(this.definitions.entries()).forEach(
            ([serviceKey, definition]) => {
                for (const dependency of definition.dependencies || []) {
                    if (!allServices.has(dependency)) {
                        throw new Error(
                            `Service '${serviceKey}' depends on '${dependency}' which is not registered ` +
                                `in container '${this.instanceId}'`
                        );
                    }
                }
            }
        );

        // Validate no circular dependencies using dependency graph analysis
        // This avoids creating actual instances during validation
        this.validateCircularDependencies(allServices);
    }

    /**
     * Validate circular dependencies using topological sort without instantiating services
     */
    private validateCircularDependencies(allServices: Set<string>): void {
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (serviceKey: string, path: string[] = []): void => {
            if (visiting.has(serviceKey)) {
                const cycle = [...path, serviceKey].join(" -> ");
                throw new Error(
                    `Circular dependency detected in container '${this.instanceId}': ${cycle}`
                );
            }

            if (visited.has(serviceKey)) {
                return;
            }

            visiting.add(serviceKey);
            const definition = this.definitions.get(serviceKey);
            
            if (definition && definition.dependencies) {
                for (const dependency of definition.dependencies) {
                    visit(dependency, [...path, serviceKey]);
                }
            }

            visiting.delete(serviceKey);
            visited.add(serviceKey);
        };

        // Visit all services to detect circular dependencies
        Array.from(allServices).forEach((serviceKey) => {
            if (!visited.has(serviceKey)) {
                visit(serviceKey);
            }
        });
    }

    /**
     * Clear all cached singleton instances
     * Useful for testing or cleanup scenarios
     */
    clearInstances(): void {
        this.instances.clear();
    }

    /**
     * Reset the entire container (clear definitions and instances)
     */
    reset(): void {
        this.definitions.clear();
        this.instances.clear();
    }
}

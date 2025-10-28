/**
 * Dependency Injection Bootstrap Module
 *
 * This module provides the core dependency injection infrastructure:
 * - ServiceContainer: Type-safe DI container with lifecycle management
 * - Service registration functions for Socket and REST instances
 * - Bootstrap utilities for container setup and validation
 */
export { ServiceContainer, type ServiceLifetime, type ServiceRegistrationOptions } from "./container";
export { registerSocketServices, registerRestServices, bootstrapContainer } from "./registry";
//# sourceMappingURL=index.d.ts.map
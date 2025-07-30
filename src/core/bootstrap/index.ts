/**
 * Dependency Injection Bootstrap Module
 * 
 * This module provides the core dependency injection infrastructure:
 * - ServiceContainer: Type-safe DI container with lifecycle management
 * - Service registration functions for Socket and REST instances
 * - Bootstrap utilities for container setup and validation
 */

// Core container and types
export { 
    ServiceContainer, 
    type ServiceLifetime, 
    type ServiceRegistrationOptions 
} from "./container";

// Service registration and bootstrap functions
export { 
    registerSocketServices, 
    registerRestServices, 
    bootstrapContainer 
} from "./registry";
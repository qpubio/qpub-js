import { ServiceContainer } from "./container";
import { Option } from "../../types/config/options";
/**
 * Register all services for Socket-based instances
 */
export declare function registerSocketServices(container: ServiceContainer, instanceId: string, options?: Partial<Option>): void;
/**
 * Register all services for REST-based instances
 */
export declare function registerRestServices(container: ServiceContainer, instanceId: string, options?: Partial<Option>): void;
/**
 * Bootstrap a container with validation
 */
export declare function bootstrapContainer(container: ServiceContainer, type: "socket" | "rest", instanceId: string, options?: Partial<Option>): void;
//# sourceMappingURL=registry.d.ts.map
import { ServiceContainer } from "../core/bootstrap";
import { Option } from "../types/config/options";
import { IOptionManager, IAuthManager, ISocketChannelManager } from "../types/services/managers";
import { IWebSocketClient, IHttpClient, ILogger, ILoggerFactory } from "../types/services/clients";
import { IConnection } from "../types/services/connection";
/**
 * Test-specific service container with enhanced mocking capabilities
 */
export declare class TestContainer extends ServiceContainer {
    /**
     * Register a mock implementation for a service
     *
     * @param key - Service identifier
     * @param mockInstance - Mock instance to use
     */
    mock<T>(key: string, mockInstance: T): void;
    /**
     * Override a service registration with a new factory
     *
     * @param key - Service identifier
     * @param factory - New factory function
     */
    override<T>(key: string, factory: (container: ServiceContainer) => T): void;
    /**
     * Clear a specific service instance and registration
     *
     * @param key - Service identifier
     */
    private clearService;
}
/**
 * Create a test container with Socket services pre-registered
 *
 * @param instanceId - Test instance identifier
 * @param options - Socket options
 * @returns Configured test container
 */
export declare function createTestSocketContainer(instanceId?: string, options?: Partial<Option>): TestContainer;
/**
 * Create a test container with REST services pre-registered
 *
 * @param instanceId - Test instance identifier
 * @param options - REST options
 * @returns Configured test container
 */
export declare function createTestRestContainer(instanceId?: string, options?: Partial<Option>): TestContainer;
/**
 * Mock function interface for type safety
 */
interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockResolvedValue: T extends (...args: any[]) => Promise<infer R> ? (value: R) => MockFunction<T> : never;
    mockRejectedValue: T extends (...args: any[]) => Promise<any> ? (error: any) => MockFunction<T> : never;
    mockImplementation(fn: T): MockFunction<T>;
    mockClear(): void;
    mockReset(): void;
}
/**
 * Mocked type for service interfaces
 */
type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? MockFunction<T[K]> : T[K];
};
/**
 * Mock factory functions for creating service mocks
 */
export declare const MockFactory: {
    /**
     * Create a mock IOptionManager
     */
    createOptionManager(overrides?: Partial<IOptionManager>): Mocked<IOptionManager>;
    /**
     * Create a mock IAuthManager
     */
    createAuthManager(overrides?: Partial<IAuthManager>): Mocked<IAuthManager>;
    /**
     * Create a mock IWebSocketClient
     */
    createWebSocketClient(overrides?: Partial<IWebSocketClient>): Mocked<IWebSocketClient>;
    /**
     * Create a mock IConnection
     */
    createConnection(overrides?: Partial<IConnection>): Mocked<IConnection>;
    /**
     * Create a mock ISocketChannelManager
     */
    createSocketChannelManager(overrides?: Partial<ISocketChannelManager>): Mocked<ISocketChannelManager>;
    /**
     * Create a mock IHttpClient
     */
    createHttpClient(overrides?: Partial<IHttpClient>): Mocked<IHttpClient>;
    /**
     * Create a mock ILogger
     */
    createLogger(overrides?: Partial<ILogger>): Mocked<ILogger>;
    /**
     * Create a mock ILoggerFactory
     */
    createLoggerFactory(overrides?: Partial<ILoggerFactory>): Mocked<ILoggerFactory>;
};
/**
 * Test utilities for common testing scenarios
 */
export declare const TestUtils: {
    /**
     * Create a fully mocked Socket container for isolated testing
     */
    createMockedSocketContainer(instanceId?: string): {
        container: TestContainer;
        mocks: {
            optionManager: Mocked<IOptionManager>;
            authManager: Mocked<IAuthManager>;
            wsClient: Mocked<IWebSocketClient>;
            connection: Mocked<IConnection>;
            socketChannelManager: Mocked<ISocketChannelManager>;
            logger: Mocked<ILogger>;
            loggerFactory: Mocked<ILoggerFactory>;
        };
    };
    /**
     * Create a partially mocked container with some real services
     *
     * @param realServices - Services to keep as real implementations
     * @param options - Options for real services
     */
    createPartiallyMockedContainer(realServices?: string[], options?: Partial<Option>): TestContainer;
};
export {};

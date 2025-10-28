import { ServiceContainer, registerSocketServices, registerRestServices } from "../core/bootstrap";
import { Option } from "../types/config/options";
import {
    IOptionManager,
    IAuthManager,
    ISocketChannelManager,
} from "../types/services/managers";
import {
    IWebSocketClient,
    IHttpClient,
    ILogger,
    ILoggerFactory,
} from "../types/services/clients";
import { IConnection } from "../types/services/connection";

/**
 * Test-specific service container with enhanced mocking capabilities
 */
export class TestContainer extends ServiceContainer {
    /**
     * Register a mock implementation for a service
     * 
     * @param key - Service identifier
     * @param mockInstance - Mock instance to use
     */
    mock<T>(key: string, mockInstance: T): void {
        // Clear any existing instance
        this.clearService(key);
        
        // Register the mock as a singleton
        this.register<T>(
            key,
            () => mockInstance,
            { lifetime: "singleton" }
        );
    }

    /**
     * Override a service registration with a new factory
     * 
     * @param key - Service identifier
     * @param factory - New factory function
     */
    override<T>(key: string, factory: (container: ServiceContainer) => T): void {
        // Clear any existing instance
        this.clearService(key);
        
        // Register the override
        this.register<T>(key, factory, { lifetime: "singleton" });
    }

    /**
     * Clear a specific service instance and registration
     * 
     * @param key - Service identifier
     */
    private clearService(key: string): void {
        // Access private members for testing purposes
        (this as any).instances.delete(key);
        (this as any).definitions.delete(key);
    }
}

/**
 * Create a test container with Socket services pre-registered
 * 
 * @param instanceId - Test instance identifier
 * @param options - Socket options
 * @returns Configured test container
 */
export function createTestSocketContainer(
    instanceId: string = "test-socket",
    options: Partial<Option> = {}
): TestContainer {
    const container = new TestContainer(instanceId);
    registerSocketServices(container, instanceId, options);
    return container;
}

/**
 * Create a test container with REST services pre-registered
 * 
 * @param instanceId - Test instance identifier  
 * @param options - REST options
 * @returns Configured test container
 */
export function createTestRestContainer(
    instanceId: string = "test-rest",
    options: Partial<Option> = {}
): TestContainer {
    const container = new TestContainer(instanceId);
    registerRestServices(container, instanceId, options);
    return container;
}

/**
 * Mock function interface for type safety
 */
interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockResolvedValue: T extends (...args: any[]) => Promise<infer R> 
        ? (value: R) => MockFunction<T> 
        : never;
    mockRejectedValue: T extends (...args: any[]) => Promise<any>
        ? (error: any) => MockFunction<T>
        : never;
    mockImplementation(fn: T): MockFunction<T>;
    mockClear(): void;
    mockReset(): void;
}

/**
 * Mocked type for service interfaces
 */
type Mocked<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any 
        ? MockFunction<T[K]> 
        : T[K];
};

/**
 * Create a mock function with Jest compatibility
 */
function createMockFn<T extends (...args: any[]) => any>(
    defaultReturnValue?: ReturnType<T>
): MockFunction<T> {
    // Check if Jest is available using global access
    const globalObj = (typeof global !== 'undefined' ? global : window) as any;
    const isJestAvailable = globalObj.jest && typeof globalObj.jest.fn === 'function';
    
    if (isJestAvailable) {
        const jestMock = globalObj.jest.fn() as any;
        if (defaultReturnValue !== undefined) {
            jestMock.mockReturnValue(defaultReturnValue);
        }
        return jestMock;
    }
    
    // Fallback implementation for non-Jest environments
    const mockFn = ((...args: any[]) => defaultReturnValue) as any;
    mockFn.mockReturnValue = (value: ReturnType<T>) => {
        mockFn._returnValue = value;
        return mockFn;
    };
    mockFn.mockResolvedValue = (value: any) => {
        mockFn._returnValue = Promise.resolve(value);
        return mockFn;
    };
    mockFn.mockRejectedValue = (error: any) => {
        mockFn._returnValue = Promise.reject(error);
        return mockFn;
    };
    mockFn.mockImplementation = (fn: T) => {
        Object.setPrototypeOf(mockFn, fn);
        return mockFn;
    };
    mockFn.mockClear = () => {/* no-op */};
    mockFn.mockReset = () => {/* no-op */};
    
    return mockFn;
}

/**
 * Mock factory functions for creating service mocks
 */
export const MockFactory = {
    /**
     * Create a mock IOptionManager
     */
    createOptionManager(overrides: Partial<IOptionManager> = {}): Mocked<IOptionManager> {
        return {
            getOption: createMockFn(),
            setOption: createMockFn(),
            reset: createMockFn(),
            ...overrides,
        } as Mocked<IOptionManager>;
    },

    /**
     * Create a mock IAuthManager
     */
    createAuthManager(overrides: Partial<IAuthManager> = {}): Mocked<IAuthManager> {
        return {
            authenticate: createMockFn(),
            isAuthenticated: createMockFn(false),
            shouldAutoAuthenticate: createMockFn(false),
            getAuthenticateUrl: createMockFn(""),
            requestToken: createMockFn(),
            getCurrentToken: createMockFn(null),
            getToken: createMockFn(null),
            clearToken: createMockFn(),
            getAuthHeaders: createMockFn({}),
            getAuthQueryParams: createMockFn(""),
            reset: createMockFn(),
            on: createMockFn(),
            off: createMockFn(),
            emit: createMockFn(),
            removeAllListeners: createMockFn(),
            ...overrides,
        } as Mocked<IAuthManager>;
    },

    /**
     * Create a mock IWebSocketClient
     */
    createWebSocketClient(overrides: Partial<IWebSocketClient> = {}): Mocked<IWebSocketClient> {
        return {
            connect: createMockFn(),
            disconnect: createMockFn(),
            isConnected: createMockFn(false),
            getSocket: createMockFn(null),
            send: createMockFn(),
            reset: createMockFn(),
            ...overrides,
        } as Mocked<IWebSocketClient>;
    },

    /**
     * Create a mock IConnection
     */
    createConnection(overrides: Partial<IConnection> = {}): Mocked<IConnection> {
        return {
            connect: createMockFn(),
            disconnect: createMockFn(),
            isConnected: createMockFn(false),
            reset: createMockFn(),
            on: createMockFn(),
            off: createMockFn(),
            emit: createMockFn(),
            removeAllListeners: createMockFn(),
            ...overrides,
        } as Mocked<IConnection>;
    },

    /**
     * Create a mock ISocketChannelManager
     */
    createSocketChannelManager(overrides: Partial<ISocketChannelManager> = {}): Mocked<ISocketChannelManager> {
        return {
            get: createMockFn(),
            has: createMockFn(false),
            remove: createMockFn(),
            reset: createMockFn(),
            resubscribeAllChannels: createMockFn(),
            pendingSubscribeAllChannels: createMockFn(),
            ...overrides,
        } as Mocked<ISocketChannelManager>;
    },

    /**
     * Create a mock IHttpClient
     */
    createHttpClient(overrides: Partial<IHttpClient> = {}): Mocked<IHttpClient> {
        return {
            get: createMockFn(),
            post: createMockFn(),
            put: createMockFn(),
            delete: createMockFn(),
            patch: createMockFn(),
            ...overrides,
        } as Mocked<IHttpClient>;
    },

    /**
     * Create a mock ILogger
     */
    createLogger(overrides: Partial<ILogger> = {}): Mocked<ILogger> {
        return {
            error: createMockFn(),
            warn: createMockFn(),
            info: createMockFn(),
            debug: createMockFn(),
            trace: createMockFn(),
            ...overrides,
        } as Mocked<ILogger>;
    },

    /**
     * Create a mock ILoggerFactory
     */
    createLoggerFactory(overrides: Partial<ILoggerFactory> = {}): Mocked<ILoggerFactory> {
        const mockLogger = MockFactory.createLogger();
        return {
            createLogger: createMockFn(mockLogger),
            ...overrides,
        } as Mocked<ILoggerFactory>;
    },
};

/**
 * Test utilities for common testing scenarios
 */
export const TestUtils = {
    /**
     * Create a fully mocked Socket container for isolated testing
     */
    createMockedSocketContainer(instanceId: string = "test-socket"): {
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
    } {
        const container = new TestContainer(instanceId);
        
        const mocks = {
            optionManager: MockFactory.createOptionManager(),
            authManager: MockFactory.createAuthManager(),
            wsClient: MockFactory.createWebSocketClient(),
            connection: MockFactory.createConnection(),
            socketChannelManager: MockFactory.createSocketChannelManager(),
            logger: MockFactory.createLogger(),
            loggerFactory: MockFactory.createLoggerFactory(),
        };

        // Register all mocks
        container.mock("optionManager", mocks.optionManager);
        container.mock("authManager", mocks.authManager);
        container.mock("wsClient", mocks.wsClient);
        container.mock("connection", mocks.connection);
        container.mock("socketChannelManager", mocks.socketChannelManager);
        container.mock("loggerFactory", mocks.loggerFactory);

        return { container, mocks };
    },

    /**
     * Create a partially mocked container with some real services
     * 
     * @param realServices - Services to keep as real implementations
     * @param options - Options for real services
     */
    createPartiallyMockedContainer(
        realServices: string[] = ["optionManager"],
        options: Partial<Option> = {}
    ): TestContainer {
        const container = createTestSocketContainer("test-partial", options);
        
        // Mock all services except the ones specified as real
        const allServices = [
            "authManager",
            "wsClient", 
            "connection",
            "socketChannelManager",
            "loggerFactory",
        ];
        
        allServices
            .filter(service => !realServices.includes(service))
            .forEach(service => {
                switch (service) {
                    case "authManager":
                        container.mock(service, MockFactory.createAuthManager());
                        break;
                    case "wsClient":
                        container.mock(service, MockFactory.createWebSocketClient());
                        break;
                    case "connection":
                        container.mock(service, MockFactory.createConnection());
                        break;
                    case "socketChannelManager":
                        container.mock(service, MockFactory.createSocketChannelManager());
                        break;
                    case "loggerFactory":
                        container.mock(service, MockFactory.createLoggerFactory());
                        break;
                }
            });
        
        return container;
    },
}; 
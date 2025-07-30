import { TestUtils, createTestSocketContainer, MockFactory } from '../src/testing';
import { Connection } from '../src/core/connections/connection';
import { IConnection, IAuthManager, IOptionManager } from '../src/interfaces/services.interface';

describe('Testing Utilities', () => {
    describe('MockFactory', () => {
        it('should create mocks with proper interfaces', () => {
            const mockAuth = MockFactory.createAuthManager();
            const mockConnection = MockFactory.createConnection();
            const mockLogger = MockFactory.createLogger();

            // All mocks should have the expected methods
            expect(typeof mockAuth.authenticate).toBe('function');
            expect(typeof mockAuth.isAuthenticated).toBe('function');
            expect(typeof mockConnection.connect).toBe('function');
            expect(typeof mockConnection.disconnect).toBe('function');
            expect(typeof mockLogger.info).toBe('function');
            expect(typeof mockLogger.error).toBe('function');
        });

        it('should allow overriding mock behavior', () => {
            const customAuth = MockFactory.createAuthManager();
            const customBehavior = {
                isAuthenticated: customAuth.isAuthenticated,
            };
            
            const mockAuth = MockFactory.createAuthManager(customBehavior);
            expect(mockAuth.isAuthenticated).toBe(customBehavior.isAuthenticated);
        });
    });

    describe('TestUtils.createMockedSocketContainer', () => {
        it('should create a fully mocked container with all services', () => {
            const { container, mocks } = TestUtils.createMockedSocketContainer();

            // All services should be available
            expect(container.isRegistered('optionManager')).toBe(true);
            expect(container.isRegistered('authManager')).toBe(true);
            expect(container.isRegistered('wsClient')).toBe(true);
            expect(container.isRegistered('connection')).toBe(true);
            expect(container.isRegistered('socketChannelManager')).toBe(true);
            expect(container.isRegistered('loggerFactory')).toBe(true);

            // Mocks should be properly configured
            expect(typeof mocks.authManager.authenticate).toBe('function');
            expect(typeof mocks.connection.connect).toBe('function');
            expect(typeof mocks.wsClient.connect).toBe('function');

            // Services should resolve to the provided mocks
            const authManager = container.resolve<IAuthManager>('authManager');
            const connection = container.resolve<IConnection>('connection');

            expect(authManager).toBe(mocks.authManager);
            expect(connection).toBe(mocks.connection);
        });
    });

    describe('TestUtils.createPartiallyMockedContainer', () => {
        it('should keep specified services real and mock others', () => {
            const container = TestUtils.createPartiallyMockedContainer(
                ['optionManager'], 
                { apiKey: 'test-key' }
            );

            // OptionManager should be real
            const optionManager = container.resolve<IOptionManager>('optionManager');
            expect(optionManager.getOption('apiKey')).toBe('test-key');

            // Other services should be mocked
            const authManager = container.resolve<IAuthManager>('authManager');
            expect(typeof authManager.authenticate).toBe('function');
            
            // Check if it's a mock (duck typing)
            const maybeMock = authManager.authenticate as any;
            const hasMockMethods = 
                typeof maybeMock.mockReturnValue === 'function' ||
                typeof maybeMock._returnValue !== 'undefined';
            expect(hasMockMethods).toBe(true);
        });
    });

    describe('createTestSocketContainer', () => {
        it('should create container with real services and support mocking', () => {
            const container = createTestSocketContainer('test-integration', {
                apiKey: 'integration-test-key'
            });

            // Services should be real implementations
            const optionManager = container.resolve<IOptionManager>('optionManager');
            expect(optionManager.getOption('apiKey')).toBe('integration-test-key');

            const connection = container.resolve<IConnection>('connection');
            expect(connection).toBeInstanceOf(Connection);

            // Should support service mocking after creation
            const mockAuthManager = MockFactory.createAuthManager();
            container.mock('authManager', mockAuthManager);

            const authManager = container.resolve<IAuthManager>('authManager');
            expect(authManager).toBe(mockAuthManager);
        });
    });

    describe('Container isolation', () => {
        it('should maintain isolation between test containers', () => {
            const container1 = createTestSocketContainer('test-1', { apiKey: 'key1' });
            const container2 = createTestSocketContainer('test-2', { apiKey: 'key2' });

            const options1 = container1.resolve<IOptionManager>('optionManager');
            const options2 = container2.resolve<IOptionManager>('optionManager');

            expect(options1.getOption('apiKey')).toBe('key1');
            expect(options2.getOption('apiKey')).toBe('key2');
            expect(options1).not.toBe(options2);
        });

        it('should support independent mocking', () => {
            const { container: container1, mocks: mocks1 } = TestUtils.createMockedSocketContainer('test-1');
            const { container: container2, mocks: mocks2 } = TestUtils.createMockedSocketContainer('test-2');

            // Mocks should be different instances
            expect(mocks1.authManager).not.toBe(mocks2.authManager);
            expect(mocks1.connection).not.toBe(mocks2.connection);

            // Each container should have its own mocks
            expect(container1.resolve('authManager')).toBe(mocks1.authManager);
            expect(container2.resolve('authManager')).toBe(mocks2.authManager);
        });
    });
}); 
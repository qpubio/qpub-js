# QPub Testing Utilities

Comprehensive testing utilities for the QPub SDK with dependency injection support.

## 🎯 **Quick Start**

```typescript
import { TestUtils, MockFactory, createTestSocketContainer } from '@qpub/testing';

// 1. Fully Mocked Testing (Fastest)
const { container, mocks } = TestUtils.createMockedSocketContainer();

// 2. Integration Testing (Real Services)  
const container = createTestSocketContainer('test', { apiKey: 'test-key' });

// 3. Partial Mocking (Mix of Real + Mock)
const container = TestUtils.createPartiallyMockedContainer(['optionManager']);
```

## 🧰 **Available Tools**

### TestContainer
Extended ServiceContainer with enhanced mocking capabilities:

```typescript
const container = new TestContainer('test-id');

// Mock a service
container.mock('authManager', MockFactory.createAuthManager());

// Override a service with custom factory
container.override('logger', () => new CustomLogger());

// Use like normal ServiceContainer
const service = container.resolve<IAuthManager>('authManager');
```

### MockFactory
Pre-configured mock creators for all service interfaces:

```typescript
// Create individual mocks
const mockAuth = MockFactory.createAuthManager();
const mockConnection = MockFactory.createConnection();
const mockLogger = MockFactory.createLogger();

// All mocks include Jest-compatible functions:
mockAuth.isAuthenticated.mockReturnValue(true);
mockConnection.connect.mockResolvedValue();
```

### TestUtils
High-level utilities for common testing scenarios:

```typescript
// Fully mocked environment
const { container, mocks } = TestUtils.createMockedSocketContainer();
mocks.authManager.authenticate.mockResolvedValue();

// Partially mocked (specify which services to keep real)
const container = TestUtils.createPartiallyMockedContainer(
    ['optionManager', 'authManager'], // Real services
    { apiKey: 'test-key' }            // Options for real services
);
```

## 📋 **Service Mocks Available**

| Service | Interface | Factory Method |
|---------|-----------|----------------|
| Option Manager | `IOptionManager` | `MockFactory.createOptionManager()` |
| Auth Manager | `IAuthManager` | `MockFactory.createAuthManager()` |
| WebSocket Client | `IWebSocketClient` | `MockFactory.createWebSocketClient()` |
| Connection | `IConnection` | `MockFactory.createConnection()` |
| Channel Manager | `ISocketChannelManager` | `MockFactory.createSocketChannelManager()` |
| HTTP Client | `IHttpClient` | `MockFactory.createHttpClient()` |
| Logger | `ILogger` | `MockFactory.createLogger()` |
| Logger Factory | `ILoggerFactory` | `MockFactory.createLoggerFactory()` |

## 🎭 **Testing Strategies**

### 1. Unit Testing Pattern
Perfect for testing individual classes in isolation:

```typescript
describe('AuthManager', () => {
    let authManager: AuthManager;
    let mockHttpClient: jest.Mocked<IHttpClient>;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
        mockHttpClient = MockFactory.createHttpClient() as jest.Mocked<IHttpClient>;
        mockLogger = MockFactory.createLogger() as jest.Mocked<ILogger>;
        
        authManager = new AuthManager(optionManager, mockHttpClient, mockLogger);
    });

    it('should authenticate successfully', async () => {
        mockHttpClient.post.mockResolvedValue({ token: 'test-token' });
        
        await authManager.authenticate();
        
        expect(authManager.isAuthenticated()).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledWith('/auth', expect.any(Object));
    });
});
```

### 2. Integration Testing Pattern
Great for testing service interactions:

```typescript
describe('Connection Integration', () => {
    it('should handle full connection flow', async () => {
        const container = createTestSocketContainer('integration', {
            apiKey: 'test-key',
            wsHost: 'test.example.com'
        });

        // Mock only external dependencies
        const mockHttpClient = MockFactory.createHttpClient();
        mockHttpClient.post.mockResolvedValue({ token: 'auth-token' });
        container.mock('httpClient', mockHttpClient);

        // Test with real service implementations
        const authManager = container.resolve<IAuthManager>('authManager');
        const connection = container.resolve<IConnection>('connection');

        await authManager.authenticate();
        await connection.connect();

        expect(authManager.isAuthenticated()).toBe(true);
        expect(connection.isConnected()).toBe(true);
    });
});
```

### 3. Scenario Testing Pattern
Ideal for testing complex workflows:

```typescript
describe('Error Recovery Scenarios', () => {
    it('should recover from authentication failures', async () => {
        const { container, mocks } = TestUtils.createMockedSocketContainer();

        // Configure failure then success
        mocks.authManager.authenticate
            .mockRejectedValueOnce(new Error('Auth failed'))
            .mockResolvedValueOnce();

        const connection = container.resolve<IConnection>('connection');
        
        // First attempt should fail
        await expect(connection.connect()).rejects.toThrow('Auth failed');
        
        // Second attempt should succeed
        await connection.connect();
        expect(connection.isConnected()).toBe(true);
    });
});
```

## 🔧 **Advanced Usage**

### Custom Mock Behaviors

```typescript
const mockAuth = MockFactory.createAuthManager({
    isAuthenticated: jest.fn().mockReturnValue(true),
    getToken: jest.fn().mockReturnValue('custom-token')
});
```

### Event Testing

```typescript
it('should emit events in correct order', async () => {
    const { container } = TestUtils.createMockedSocketContainer();
    const connection = container.resolve<IConnection>('connection');
    
    const events: string[] = [];
    connection.on('connecting', () => events.push('connecting'));
    connection.on('connected', () => events.push('connected'));
    
    await connection.connect();
    
    expect(events).toEqual(['connecting', 'connected']);
});
```

### Async Testing

```typescript
it('should handle async operations correctly', async () => {
    const { mocks } = TestUtils.createMockedSocketContainer();
    
    let resolver: (value: any) => void;
    const promise = new Promise(resolve => resolver = resolve);
    
    mocks.authManager.authenticate.mockImplementation(() => promise);
    
    const connectPromise = connection.connect();
    
    // Should be waiting for auth
    expect(mocks.authManager.authenticate).toHaveBeenCalled();
    
    // Complete auth
    resolver({ token: 'test' });
    await connectPromise;
    
    expect(connection.isConnected()).toBe(true);
});
```

## 🎯 **Best Practices**

### ✅ DO
- Use `MockFactory` for consistent mock creation
- Type your mocks properly with `jest.Mocked<T>`
- Test both success and failure scenarios
- Use `TestUtils` for common patterns
- Clean up mocks between tests

### ❌ DON'T
- Create mocks manually when factories exist
- Share mock instances between tests
- Mock everything - use real services when appropriate
- Forget to test error scenarios
- Test implementation details

## 🚨 **Common Issues**

### Mock Type Errors
```typescript
// ❌ Wrong: Generic mock type
const mock = MockFactory.createAuthManager();

// ✅ Correct: Jest-specific mock type
const mock = MockFactory.createAuthManager() as jest.Mocked<IAuthManager>;
```

### Container Isolation
```typescript
// ❌ Wrong: Sharing containers
const sharedContainer = createTestSocketContainer();

// ✅ Correct: Fresh container per test
beforeEach(() => {
    container = createTestSocketContainer();
});
```

### Mock Configuration
```typescript
// ❌ Wrong: Configuring mocks after service creation
const service = new MyService(mock);
mock.method.mockReturnValue('value');

// ✅ Correct: Configure mocks first
mock.method.mockReturnValue('value');
const service = new MyService(mock);
```

## 📊 **Performance Tips**

1. **Use Fully Mocked for Unit Tests** - Fastest execution
2. **Use Partial Mocking for Integration** - Balance between speed and realism
3. **Use Real Services Sparingly** - Only for critical integration tests
4. **Mock External Dependencies** - Network, file system, etc.
5. **Clean Up After Tests** - Prevent memory leaks

---

These testing utilities make the QPub SDK highly testable with the new dependency injection architecture. For more examples, see the `__tests__/` directory. 
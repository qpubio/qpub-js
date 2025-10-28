# QPub Testing Best Practices

This guide covers comprehensive testing strategies for the QPub SDK using Jest and the new dependency injection architecture.

## 🎯 **Overview**

With the new dependency injection architecture, testing has become significantly easier:

- ✅ **Isolated Unit Tests** - Mock individual services
- ✅ **Integration Tests** - Test service interactions  
- ✅ **End-to-End Tests** - Test complete workflows
- ✅ **Performance Tests** - Benchmark critical paths

## 🛠 **Setup**

### Install Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest jest-environment-jsdom prettier
```

### Jest Configuration

Our `jest.config.js` supports both Node.js and browser environments:

```javascript
// jest.config.js - Clean TypeScript configuration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

### Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch", 
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

## 🧪 **Testing Patterns**

### 1. Unit Testing with Mocks

**Perfect for testing individual services in isolation:**

```typescript
import { Connection } from '../../src/core/connections/connection';
import { MockFactory } from '../../src/testing';
import { IOptionManager, IAuthManager } from '../../src/interfaces/services.interface';

describe('Connection', () => {
    let connection: Connection;
    let mockOptionManager: jest.Mocked<IOptionManager>;
    let mockAuthManager: jest.Mocked<IAuthManager>;
    
    beforeEach(() => {
        // Create type-safe mocks using MockFactory
        mockOptionManager = MockFactory.createOptionManager() as jest.Mocked<IOptionManager>;
        mockAuthManager = MockFactory.createAuthManager() as jest.Mocked<IAuthManager>;
        
        // Configure mock behaviors
        mockOptionManager.getOption.mockImplementation((key?: any) => {
            const defaults = { wsHost: 'localhost', wsPort: 8080, isSecure: false };
            return key ? defaults[key] : defaults;
        });
        
        mockAuthManager.shouldAutoAuthenticate.mockReturnValue(false);
        
        // Inject mocked dependencies
        connection = new Connection(
            mockOptionManager,
            mockAuthManager,
            mockWsClient,
            mockChannelManager,
            mockLogger
        );
    });
    
    it('should connect with proper URL construction', async () => {
        mockAuthManager.getAuthenticateUrl.mockReturnValue('ws://localhost:8080/v1?token=test');
        
        await connection.connect();
        
        expect(mockAuthManager.getAuthenticateUrl).toHaveBeenCalledWith('ws://localhost:8080/v1');
        expect(mockWsClient.connect).toHaveBeenCalledWith('ws://localhost:8080/v1?token=test');
    });
});
```

### 2. Integration Testing with TestContainer

**Great for testing how services work together:**

```typescript
import { TestUtils, createTestSocketContainer } from '../../src/testing';
import { IConnection, IAuthManager } from '../../src/interfaces/services.interface';

describe('Socket Integration', () => {
    it('should handle complete authentication flow', async () => {
        // Create container with real services
        const container = createTestSocketContainer('integration-test', {
            apiKey: 'test-key'
        });
        
        // Mock only external dependencies
        const mockHttpClient = MockFactory.createHttpClient();
        mockHttpClient.post.mockResolvedValue({ token: 'auth-token' });
        container.mock('httpClient', mockHttpClient);
        
        // Test real service interactions
        const authManager = container.resolve<IAuthManager>('authManager');
        const connection = container.resolve<IConnection>('connection');
        
        await authManager.authenticate();
        await connection.connect();
        
        expect(authManager.isAuthenticated()).toBe(true);
        expect(connection.isConnected()).toBe(true);
    });
});
```

### 3. Fully Mocked Testing

**Ideal for testing complex scenarios without side effects:**

```typescript
import { TestUtils } from '../../src/testing';

describe('Complex Scenarios', () => {
    it('should handle connection failures gracefully', async () => {
        const { container, mocks } = TestUtils.createMockedSocketContainer();
        
        // Configure failure scenarios
        mocks.wsClient.connect.mockRejectedValue(new Error('Connection failed'));
        mocks.authManager.authenticate.mockRejectedValue(new Error('Auth failed'));
        
        const connection = container.resolve<IConnection>('connection');
        
        // Test error handling
        await expect(connection.connect()).rejects.toThrow('Connection failed');
        
        expect(mocks.wsClient.connect).toHaveBeenCalled();
        expect(mocks.logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Connection failed')
        );
    });
});
```

## 📋 **Testing Checklist**

### ✅ Unit Tests
- [ ] All public methods tested
- [ ] Error scenarios covered  
- [ ] Edge cases handled
- [ ] Dependencies properly mocked

### ✅ Integration Tests  
- [ ] Service interactions verified
- [ ] Data flow tested
- [ ] Real implementations used where appropriate
- [ ] External dependencies mocked

### ✅ Performance Tests
- [ ] Critical paths benchmarked
- [ ] Memory usage verified
- [ ] Connection handling tested
- [ ] Large data scenarios covered

## 🎭 **Mock Strategies**

### When to Mock Everything
```typescript
// Perfect for isolated unit tests
const { container, mocks } = TestUtils.createMockedSocketContainer();
```

### When to Use Real Services
```typescript
// Great for integration tests
const container = createTestSocketContainer('test', { apiKey: 'real-key' });
```

### When to Mix Real + Mocked
```typescript
// Ideal for testing specific interactions
const container = TestUtils.createPartiallyMockedContainer(
    ['optionManager', 'authManager'], // Keep these real
    { apiKey: 'test-key' }
);
```

## 🚀 **Advanced Patterns**

### Custom Test Containers

```typescript
function createCustomTestEnvironment() {
    const container = createTestSocketContainer();
    
    // Add custom mocks
    const mockWebSocket = new MockWebSocket('ws://test');
    container.mock('wsClient', MockFactory.createWebSocketClient({
        getSocket: () => mockWebSocket
    }));
    
    return { container, mockWebSocket };
}
```

### Testing Event Flows

```typescript
it('should emit connection events in correct order', async () => {
    const { container, mocks } = TestUtils.createMockedSocketContainer();
    const connection = container.resolve<IConnection>('connection');
    
    const events: string[] = [];
    connection.on('connecting', () => events.push('connecting'));
    connection.on('connected', () => events.push('connected'));
    connection.on('failed', () => events.push('failed'));
    
    await connection.connect();
    
    expect(events).toEqual(['connecting', 'connected']);
});
```

### Testing Async Operations

```typescript
it('should handle async authentication with proper timing', async () => {
    const { mocks } = TestUtils.createMockedSocketContainer();
    
    let authResolver: (value: any) => void;
    const authPromise = new Promise(resolve => authResolver = resolve);
    
    mocks.authManager.authenticate.mockImplementation(() => authPromise);
    
    // Start connection (should wait for auth)
    const connectPromise = connection.connect();
    
    // Auth should be in progress
    expect(mocks.authManager.authenticate).toHaveBeenCalled();
    expect(connection.isConnected()).toBe(false);
    
    // Complete auth
    authResolver({ token: 'test-token' });
    await connectPromise;
    
    // Now should be connected
    expect(connection.isConnected()).toBe(true);
});
```

## 📊 **Coverage Guidelines**

### Minimum Coverage Targets
- **Statements**: 80%
- **Branches**: 80%  
- **Functions**: 80%
- **Lines**: 80%

### Critical Areas (95%+ Coverage)
- Authentication logic
- Connection management
- Error handling
- Data validation

### Excluded from Coverage
- Type definitions
- Testing utilities
- Demo/example code

## 🔧 **Common Testing Utilities**

### Test Data Factories

```typescript
export const TestDataFactory = {
    createValidOptions: () => ({
        apiKey: 'test-key',
        wsHost: 'localhost',
        wsPort: 8080,
        autoConnect: true
    }),
    
    createAuthResponse: () => ({
        token: 'test-token',
        expires: Date.now() + 3600000
    }),
    
    createErrorScenarios: () => [
        new Error('Network error'),
        new Error('Authentication failed'),
        new Error('Invalid configuration')
    ]
};
```

### Custom Matchers

```typescript
expect.extend({
    toBeConnected(received: IConnection) {
        const pass = received.isConnected();
        return {
            message: () => `expected connection to ${pass ? 'not ' : ''}be connected`,
            pass
        };
    }
});

// Usage:
expect(connection).toBeConnected();
```

## 🎯 **Best Practices Summary**

1. **Start with Unit Tests** - Test individual services first
2. **Use TypeScript Strictly** - Leverage type safety in tests  
3. **Mock External Dependencies** - Keep tests isolated
4. **Test Error Scenarios** - Don't just test happy paths
5. **Keep Tests Fast** - Aim for <1ms per unit test
6. **Use Descriptive Names** - Tests are documentation
7. **Group Related Tests** - Use `describe` blocks effectively
8. **Clean Up After Tests** - Reset mocks and clear state

## 🚨 **Common Pitfalls**

- ❌ **Testing Implementation Details** - Test behavior, not internals
- ❌ **Shared Test State** - Each test should be independent  
- ❌ **Over-Mocking** - Use real objects when possible
- ❌ **Weak Assertions** - Be specific about expected outcomes
- ❌ **No Error Testing** - Always test failure scenarios

---

With this testing strategy, you can confidently develop and maintain the QPub SDK with comprehensive test coverage and reliable quality assurance. 
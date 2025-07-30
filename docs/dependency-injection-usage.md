# Dependency Injection Usage Examples

The QPub SDK now uses a clean dependency injection architecture that makes it highly testable and modular while maintaining the same simple API for end users.

## Basic Usage (No Changes Required)

The public API remains exactly the same - existing code works without any changes:

```typescript
import { QPub } from "qpub-js";

// Socket usage - works exactly as before
const socket = QPub.Socket({
    apiKey: "your-api-key",
    autoConnect: true,
});

await socket.connection.connect();
const channel = socket.channels.get("my-channel");

// REST usage - works exactly as before
const rest = QPub.Rest({
    apiKey: "your-api-key",
});

const restChannel = rest.channels.get("my-channel");
```

## Advanced Usage: Direct Service Container Access

For advanced users who want more control:

```typescript
import {
    ServiceContainer,
    bootstrapContainer,
    IConnection,
    IAuthManager,
} from "qpub-js";

// Create and configure your own container
const container = new ServiceContainer("my-custom-instance");
bootstrapContainer(container, "socket", "my-instance", {
    apiKey: "your-api-key",
    autoConnect: false,
});

// Resolve services directly
const connection = container.resolve<IConnection>("connection");
const authManager = container.resolve<IAuthManager>("authManager");

// Use services directly
await authManager.authenticate();
await connection.connect();
```

## Testing: Unit Testing with Mocks

The new architecture makes unit testing incredibly easy:

### Option 1: Using TestContainer

```typescript
import {
    createTestSocketContainer,
    MockFactory,
    IAuthManager,
    IConnection,
} from "qpub-js";

describe("My Component", () => {
    let container: TestContainer;
    let mockAuth: jest.Mocked<IAuthManager>;
    let mockConnection: jest.Mocked<IConnection>;

    beforeEach(() => {
        container = createTestSocketContainer("test-id");

        // Create and register mocks
        mockAuth = MockFactory.createAuthManager();
        mockConnection = MockFactory.createConnection();

        container.mock("authManager", mockAuth);
        container.mock("connection", mockConnection);
    });

    it("should handle authentication", async () => {
        // Configure mock behavior
        mockAuth.isAuthenticated.mockReturnValue(true);
        mockConnection.isConnected.mockReturnValue(true);

        // Resolve and test services
        const authManager = container.resolve<IAuthManager>("authManager");
        const connection = container.resolve<IConnection>("connection");

        expect(authManager.isAuthenticated()).toBe(true);
        expect(connection.isConnected()).toBe(true);
    });
});
```

### Option 2: Using TestUtils for Full Mocking

```typescript
import { TestUtils } from "qpub-js";

describe("Complete Integration Test", () => {
    it("should work with fully mocked services", () => {
        const { container, mocks } = TestUtils.createMockedSocketContainer();

        // All services are mocked and ready to use
        mocks.authManager.isAuthenticated.mockReturnValue(true);
        mocks.connection.connect.mockResolvedValue();

        // Test your logic with complete isolation
        const authManager = container.resolve("authManager");
        expect(authManager.isAuthenticated()).toBe(true);
    });
});
```

### Option 3: Partial Mocking (Mix Real and Mock Services)

```typescript
import { TestUtils } from "qpub-js";

describe("Partial Integration Test", () => {
    it("should work with some real services", () => {
        // Keep OptionManager real, mock everything else
        const container = TestUtils.createPartiallyMockedContainer(
            ["optionManager"],
            { apiKey: "test-key" }
        );

        // OptionManager is real and configured
        const optionManager = container.resolve("optionManager");
        expect(optionManager.getOption("apiKey")).toBe("test-key");

        // Other services are mocked
        const authManager = container.resolve("authManager");
        expect(typeof authManager.authenticate).toBe("function");
    });
});
```

## Custom Service Registration

You can also register your own services:

```typescript
import { ServiceContainer } from "qpub-js";

// Create custom service
class MyCustomService {
    constructor(private logger: ILogger) {}

    doSomething() {
        this.logger.info("Custom service doing something");
    }
}

// Register in container
const container = new ServiceContainer("custom");
bootstrapContainer(container, "socket", "custom");

container.register(
    "myService",
    (c) => new MyCustomService(c.resolve("logger")),
    { dependencies: ["logger"] }
);

// Use custom service
const myService = container.resolve<MyCustomService>("myService");
myService.doSomething();
```

## Benefits

### 🧪 Perfect Testability

- Every dependency is injectable and mockable
- No global state to interfere with tests
- Easy to test edge cases and error conditions

### 🔒 Complete Isolation

- Each Socket/Rest instance is completely isolated
- Multiple instances can run in parallel without interference
- Perfect for microservice architectures

### ⚡ Type Safety

- Full TypeScript interface support
- Compile-time dependency validation
- Excellent IntelliSense experience

### 🛠️ Developer Experience

- Clean separation of concerns
- Easy to extend with new services
- Rich error messages for debugging

The dependency injection architecture provides enterprise-grade testability and modularity while keeping the public API simple and unchanged for regular usage.

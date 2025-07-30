# QPub SDK Architecture Improvement Plan

## 🎯 **Current State & Goals**

### **Current Architecture**
We have a working SDK with a clear structure in `src/core/` that uses:
- **Singleton Pattern** for managers (Connection, Auth, Option, ChannelManager)
- **Event-Driven Architecture** with custom EventEmitter
- **Clear Separation** between Socket and REST interfaces
- **Channel Abstraction** with BaseChannel, SocketChannel, RestChannel

### **Improvement Goals**
- **Improve Testability** without major rewrites
- **Reduce Coupling** between components
- **Maintain Current API** for consumers
- **Enable Better DX** for development and debugging

## 📁 **Proposed Structure (Incremental)**

Keep most of your current structure but organize it better:

```
src/
├── core/                           # Keep existing core logic
│   ├── managers/                   # Group managers together
│   │   ├── auth-manager.ts
│   │   ├── option-manager.ts
│   │   ├── channel-manager.ts
│   │   └── index.ts
│   │
│   ├── connections/                # Group connection logic
│   │   ├── connection.ts
│   │   ├── websocket-client.ts
│   │   └── index.ts
│   │
│   ├── channels/                   # Group channel logic  
│   │   ├── base-channel.ts
│   │   ├── socket-channel.ts
│   │   ├── rest-channel.ts
│   │   └── index.ts
│   │
│   ├── transport/                  # Group transport logic
│   │   ├── http-client.ts
│   │   ├── websocket-client.ts
│   │   └── index.ts
│   │
│   ├── shared/                     # Shared utilities
│   │   ├── event-emitter.ts
│   │   ├── logger.ts
│   │   └── index.ts
│   │
│   ├── socket.ts                   # Main Socket class
│   ├── rest.ts                     # Main REST class
│   └── index.ts
│
├── interfaces/                     # Keep existing interfaces
│   ├── channel.interface.ts
│   ├── connection.interface.ts
│   ├── option.interface.ts
│   └── ...
│
├── types/                          # Keep existing types
│   └── ...
│
├── utils/                          # Keep existing utils  
│   └── ...
│
├── react-integration/              # Keep React integration as-is
│   └── ...
│
└── qpub.ts                         # Main entry point
```

## 🔧 **Incremental Improvements**

### **Phase 1: Dependency Injection (Simple)**

Replace singletons with a simple factory pattern:

```typescript
// core/shared/factory.ts
export class ServiceFactory {
    private services = new Map<string, any>();

    constructor(private instanceId: string) {}

    register<T>(key: string, instance: T): void {
        this.services.set(key, instance);
    }

    get<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service ${key} not found`);
        }
        return service;
    }
}
```

### **Phase 2: Improve Connection Class**

```typescript
// core/connections/connection.ts  
export class Connection extends EventEmitter<ConnectionEventPayloads> {
    private static instances: Map<string, Connection> = new Map();

    private constructor(
        private instanceId: string,
        private optionManager: OptionManager,    // Inject dependencies
        private authManager: AuthManager,        // instead of getting
        private wsClient: WebSocketClient        // via getInstance
    ) {
        super();
        this.setupAuthListeners();
        this.emit(ConnectionEvents.INITIALIZED);
    }

    // Keep singleton for backward compatibility but improve internal structure
    public static getInstance(instanceId: string): Connection {
        if (!Connection.instances.has(instanceId)) {
            // Get dependencies (gradual migration from singletons)
            const optionManager = OptionManager.getInstance(instanceId);
            const authManager = AuthManager.getInstance(instanceId);  
            const wsClient = WebSocketClient.getInstance(instanceId);
            
            Connection.instances.set(
                instanceId, 
                new Connection(instanceId, optionManager, authManager, wsClient)
            );
        }
        return Connection.instances.get(instanceId)!;
    }

    // Keep all existing methods...
}
```

### **Phase 3: Add Configuration Object**

```typescript
// core/shared/config.ts
export interface SDKConfig {
    apiKey: string;
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    enableLogging?: boolean;
}

export class ConfigManager {
    constructor(private config: Partial<SDKConfig>) {}

    get<K extends keyof SDKConfig>(key: K): SDKConfig[K] {
        return this.config[key];
    }

    set<K extends keyof SDKConfig>(key: K, value: SDKConfig[K]): void {
        this.config[key] = value;
    }
}
```

### **Phase 4: Better Error Handling**

```typescript
// core/shared/errors.ts
export enum ErrorType {
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    CHANNEL_SUBSCRIPTION_FAILED = 'CHANNEL_SUBSCRIPTION_FAILED'
}

export class QPubError extends Error {
    constructor(
        public readonly type: ErrorType,
        message: string,
        public readonly context?: any
    ) {
        super(message);
        this.name = 'QPubError';
    }
}
```

## 🧪 **Testing Strategy (Pragmatic)**

### **Current Problem**
```typescript
// ❌ Hard to test - everything is connected
describe('Connection', () => {
    it('should connect', async () => {
        const connection = Connection.getInstance('test'); // Real singletons
        await connection.connect(); // Real WebSocket
    });
});
```

### **Improved Testing**
```typescript
// ✅ Easier to test - injectable dependencies
describe('Connection', () => {
    let mockOptionManager: jest.Mocked<OptionManager>;
    let mockAuthManager: jest.Mocked<AuthManager>;
    let mockWsClient: jest.Mocked<WebSocketClient>;

    beforeEach(() => {
        // Create mocks
        mockOptionManager = {
            getOption: jest.fn(),
        } as any;

        mockAuthManager = {
            isAuthenticated: jest.fn().mockReturnValue(true),
        } as any;

        mockWsClient = {
            connect: jest.fn(),
            isConnected: jest.fn(),
        } as any;
    });

    it('should connect successfully', async () => {
        // Test with mocked dependencies
        const connection = new Connection(
            'test-id',
            mockOptionManager,
            mockAuthManager, 
            mockWsClient
        );

        mockWsClient.connect.mockResolvedValue();
        mockWsClient.isConnected.mockReturnValue(true);

        await connection.connect();

        expect(mockWsClient.connect).toHaveBeenCalled();
    });
});
```

## 📈 **Benefits of This Approach**

### **For Current Codebase:**
✅ **Minimal Changes** - builds on existing structure  
✅ **Backward Compatible** - consumer API stays the same  
✅ **Gradual Migration** - can be done incrementally  
✅ **Low Risk** - no major rewrites  

### **For Development:**
✅ **Better Organization** - logical grouping of files  
✅ **Easier Testing** - mockable dependencies  
✅ **Clearer Responsibilities** - separated concerns  
✅ **Better DX** - easier to navigate and debug  

### **For Future:**
✅ **Foundation for Growth** - easier to add features  
✅ **Framework Agnostic** - core logic independent  
✅ **Maintainable** - clearer code organization  

## 🚀 **Implementation Plan**

### **Hour 1-2: File Organization**
1. Move files to new directory structure
2. Update import paths
3. Add barrel exports (index.ts files)
4. Ensure everything still works

### **Hour 3-4: Dependency Injection**
1. Implement ServiceFactory
2. Update Connection class to use injected dependencies
3. Keep singleton pattern for backward compatibility
4. Add tests for new structure

### **Hour 5-6: Configuration & Error Handling**
1. Add ConfigManager
2. Implement QPubError classes
3. Update error handling throughout codebase
4. Add comprehensive tests

### **Hour 7-8: Testing & Documentation**
1. Add unit tests for all core classes
2. Create integration tests
3. Update documentation
4. Performance testing

## ⚖️ **Trade-offs**

### **Pros:**
- **Low Risk** - incremental changes
- **Maintains API** - no breaking changes for consumers
- **Improves Testability** - easier to mock dependencies
- **Better Organization** - clearer file structure

### **Cons:**
- **Still Some Coupling** - not as clean as full DDD
- **Gradual Improvement** - not immediately perfect
- **Learning Curve** - team needs to adapt to new patterns

### **Why This Approach:**
1. **Practical** - works with your current codebase
2. **Safe** - minimal risk of breaking existing functionality
3. **Testable** - enables proper unit testing
4. **Extensible** - foundation for future improvements

This approach respects your current investment while making meaningful improvements to testability, maintainability, and developer experience. The public API remains the same, so consumers see no changes, but the internal structure becomes much more manageable. 
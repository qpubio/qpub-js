# QPub SDK Architecture Proposal

## 🎯 **Architectural Principles**

### **1. Domain-Driven Design (Simplified for SDK)**
- **Bounded Contexts**: Clear domain boundaries
- **Aggregates**: Logical grouping of related entities
- **Domain Services**: Business logic encapsulation
- **Value Objects**: Immutable data structures

### **2. Clean Architecture**
- **Domain Layer**: Core business logic
- **Application Layer**: Use cases and services
- **Infrastructure Layer**: External dependencies
- **Interface Layer**: Public API

### **3. SOLID Principles**
- **Dependency Inversion**: Depend on abstractions
- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Open for extension, closed for modification

## 📁 **Proposed Directory Structure**

```
src/
├── domain/                          # Domain Layer (Business Logic)
│   ├── connection/                  # Connection Bounded Context
│   │   ├── entities/
│   │   │   ├── connection.entity.ts
│   │   │   └── connection-state.value-object.ts
│   │   ├── services/
│   │   │   ├── connection.service.ts
│   │   │   └── reconnection.service.ts
│   │   ├── events/
│   │   │   └── connection.events.ts
│   │   └── interfaces/
│   │       └── connection.repository.ts
│   │
│   ├── channels/                    # Channel Bounded Context
│   │   ├── entities/
│   │   │   ├── channel.entity.ts
│   │   │   └── subscription.value-object.ts
│   │   ├── services/
│   │   │   ├── channel.service.ts
│   │   │   └── subscription.service.ts
│   │   └── interfaces/
│   │       └── channel.repository.ts
│   │
│   ├── authentication/              # Auth Bounded Context
│   │   ├── entities/
│   │   │   └── auth-session.entity.ts
│   │   ├── services/
│   │   │   ├── authentication.service.ts
│   │   │   └── token-management.service.ts
│   │   ├── value-objects/
│   │   │   └── jwt-token.value-object.ts
│   │   └── interfaces/
│   │       └── token.repository.ts
│   │
│   └── shared/                      # Shared Domain
│       ├── events/
│       │   ├── domain-event.base.ts
│       │   └── event-dispatcher.ts
│       ├── value-objects/
│       │   ├── instance-id.value-object.ts
│       │   └── error-info.value-object.ts
│       └── interfaces/
│           └── repository.base.ts
│
├── application/                     # Application Layer (Use Cases)
│   ├── use-cases/
│   │   ├── connection/
│   │   │   ├── connect-socket.use-case.ts
│   │   │   ├── disconnect-socket.use-case.ts
│   │   │   └── handle-reconnection.use-case.ts
│   │   ├── channels/
│   │   │   ├── subscribe-to-channel.use-case.ts
│   │   │   ├── unsubscribe-from-channel.use-case.ts
│   │   │   └── publish-message.use-case.ts
│   │   └── authentication/
│   │       ├── authenticate-user.use-case.ts
│   │       └── refresh-token.use-case.ts
│   │
│   ├── services/                    # Application Services
│   │   ├── message-routing.service.ts
│   │   ├── configuration.service.ts
│   │   └── event-coordination.service.ts
│   │
│   └── interfaces/                  # Application Interfaces
│       ├── transport.interface.ts
│       └── configuration.interface.ts
│
├── infrastructure/                  # Infrastructure Layer
│   ├── transport/
│   │   ├── websocket/
│   │   │   ├── websocket.client.ts
│   │   │   └── websocket.adapter.ts
│   │   ├── http/
│   │   │   ├── http.client.ts
│   │   │   └── rest.adapter.ts
│   │   └── transport.factory.ts
│   │
│   ├── repositories/                # Data Access
│   │   ├── connection.repository.impl.ts
│   │   ├── channel.repository.impl.ts
│   │   └── token.repository.impl.ts
│   │
│   ├── external/                    # External Services
│   │   ├── auth-api.client.ts
│   │   └── message-api.client.ts
│   │
│   └── persistence/                 # State Management
│       ├── in-memory.store.ts
│       └── session.store.ts
│
├── interface/                       # Interface Layer (Public API)
│   ├── sdk/
│   │   ├── socket.sdk.ts
│   │   ├── rest.sdk.ts
│   │   └── qpub.sdk.ts
│   │
│   ├── adapters/                    # Framework Integrations
│   │   ├── react/
│   │   │   ├── hooks/
│   │   │   ├── components/
│   │   │   └── providers/
│   │   └── vue/                     # Future framework support
│   │
│   └── dto/                         # Data Transfer Objects
│       ├── connection.dto.ts
│       ├── channel.dto.ts
│       └── message.dto.ts
│
├── shared/                          # Cross-Cutting Concerns
│   ├── dependency-injection/
│   │   ├── container.ts
│   │   ├── decorators.ts
│   │   └── providers.ts
│   │
│   ├── events/
│   │   ├── event-bus.ts
│   │   └── event.types.ts
│   │
│   ├── logging/
│   │   ├── logger.interface.ts
│   │   ├── console.logger.ts
│   │   └── logger.factory.ts
│   │
│   ├── utils/
│   │   ├── crypto.util.ts
│   │   ├── uuid.util.ts
│   │   └── time.util.ts
│   │
│   └── types/                       # Consumer-facing types
│       ├── events.types.ts
│       ├── configuration.types.ts
│       └── index.ts
│
└── main.ts                          # Main Entry Point
```

## 🔧 **Key Architectural Improvements**

### **1. Dependency Injection Container**

Replace singletons with a lightweight DI container:

```typescript
// shared/dependency-injection/container.ts
export class DIContainer {
    private services = new Map<string, any>();
    private factories = new Map<string, () => any>();

    register<T>(token: string, implementation: T): void {
        this.services.set(token, implementation);
    }

    registerFactory<T>(token: string, factory: () => T): void {
        this.factories.set(token, factory);
    }

    resolve<T>(token: string): T {
        if (this.services.has(token)) {
            return this.services.get(token);
        }
        if (this.factories.has(token)) {
            const instance = this.factories.get(token)!();
            this.services.set(token, instance);
            return instance;
        }
        throw new Error(`Service ${token} not found`);
    }
}
```

### **2. Domain Entities (Business Logic)**

```typescript
// domain/connection/entities/connection.entity.ts
export class ConnectionEntity {
    constructor(
        private id: InstanceId,
        private state: ConnectionState,
        private config: ConnectionConfig
    ) {}

    async connect(): Promise<void> {
        this.state = this.state.connecting();
        // Domain logic for connection
    }

    disconnect(): void {
        this.state = this.state.disconnecting();
        // Domain logic for disconnection
    }

    // Rich domain behavior
    canReconnect(): boolean {
        return this.state.allowsReconnection() && 
               this.config.autoReconnect;
    }
}
```

### **3. Use Cases (Application Logic)**

```typescript
// application/use-cases/connection/connect-socket.use-case.ts
@Injectable()
export class ConnectSocketUseCase {
    constructor(
        private connectionRepo: IConnectionRepository,
        private transportService: ITransportService,
        private eventBus: IEventBus
    ) {}

    async execute(request: ConnectSocketRequest): Promise<void> {
        const connection = await this.connectionRepo.findById(request.instanceId);
        
        await connection.connect();
        await this.transportService.establish(connection);
        
        this.eventBus.publish(new ConnectionEstablishedEvent(connection.id));
        
        await this.connectionRepo.save(connection);
    }
}
```

### **4. Clean Repository Pattern**

```typescript
// domain/connection/interfaces/connection.repository.ts
export interface IConnectionRepository {
    findById(id: InstanceId): Promise<ConnectionEntity>;
    save(connection: ConnectionEntity): Promise<void>;
    delete(id: InstanceId): Promise<void>;
}

// infrastructure/repositories/connection.repository.impl.ts
@Injectable()
export class ConnectionRepository implements IConnectionRepository {
    private connections = new Map<string, ConnectionEntity>();

    async findById(id: InstanceId): Promise<ConnectionEntity> {
        const connection = this.connections.get(id.value);
        if (!connection) {
            throw new Error(`Connection ${id.value} not found`);
        }
        return connection;
    }

    async save(connection: ConnectionEntity): Promise<void> {
        this.connections.set(connection.id.value, connection);
    }
}
```

### **5. Event-Driven Architecture**

```typescript
// shared/events/event-bus.ts
export interface IDomainEvent {
    eventId: string;
    occurredOn: Date;
    eventType: string;
}

@Injectable()
export class EventBus {
    private handlers = new Map<string, Array<(event: IDomainEvent) => void>>();

    subscribe<T extends IDomainEvent>(
        eventType: string, 
        handler: (event: T) => void
    ): void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);
    }

    async publish(event: IDomainEvent): Promise<void> {
        const handlers = this.handlers.get(event.eventType) || [];
        await Promise.all(handlers.map(handler => handler(event)));
    }
}
```

### **6. Value Objects for Type Safety**

```typescript
// domain/shared/value-objects/instance-id.value-object.ts
export class InstanceId {
    constructor(private readonly _value: string) {
        if (!_value || _value.length === 0) {
            throw new Error('InstanceId cannot be empty');
        }
    }

    get value(): string {
        return this._value;
    }

    equals(other: InstanceId): boolean {
        return this._value === other._value;
    }
}
```

## 🚀 **Implementation Strategy**

### **Phase 1: Foundation (Week 1-2)**
1. Create new directory structure
2. Implement DI container
3. Create base interfaces and abstractions
4. Implement event bus

### **Phase 2: Domain Layer (Week 3-4)**  
1. Extract domain entities
2. Create value objects
3. Define domain services
4. Implement domain events

### **Phase 3: Application Layer (Week 5-6)**
1. Create use cases
2. Implement application services
3. Define interfaces for infrastructure

### **Phase 4: Infrastructure Layer (Week 7-8)**
1. Implement repositories
2. Create transport adapters
3. External service clients

### **Phase 5: Interface Layer (Week 9-10)**
1. Create new SDK interfaces
2. Update React integration
3. Maintain backward compatibility

### **Phase 6: Migration & Testing (Week 11-12)**
1. Gradual migration from old structure
2. Comprehensive testing
3. Documentation updates

## 📈 **Benefits of This Architecture**

### **For Maintainability:**
✅ **Clear separation of concerns**  
✅ **Testable components** (no more singletons)  
✅ **Loosely coupled** modules  
✅ **Domain logic isolation**  

### **For Scalability:**
✅ **Easy to add new transports** (gRPC, Server-Sent Events)  
✅ **Framework-agnostic core**  
✅ **Plugin architecture** ready  
✅ **Microservice-like modularity**  

### **For Developer Experience:**
✅ **Better IntelliSense** with strong typing  
✅ **Easier debugging** with clear boundaries  
✅ **Self-documenting** code structure  
✅ **Onboarding-friendly** architecture  

## 🧪 **Testing Strategy**

```typescript
// Example: Testing with DI
describe('ConnectSocketUseCase', () => {
    let useCase: ConnectSocketUseCase;
    let mockRepo: jest.Mocked<IConnectionRepository>;
    let mockTransport: jest.Mocked<ITransportService>;

    beforeEach(() => {
        mockRepo = createMockRepository();
        mockTransport = createMockTransport();
        useCase = new ConnectSocketUseCase(mockRepo, mockTransport, mockEventBus);
    });

    it('should connect successfully', async () => {
        // Test implementation
    });
});
```

## ⚖️ **Trade-offs & Considerations**

### **Pros:**
- **Highly maintainable** and testable
- **Clear separation** of concerns  
- **Framework agnostic** core
- **Easy to extend** with new features

### **Cons:**
- **Initial complexity** increase
- **More files** to manage
- **Learning curve** for team
- **Bundle size** consideration (mitigated with tree-shaking)

### **Mitigation Strategies:**
- **No gradual migration**
- **No need to maintain backward compatibility** during transition (This project not used in production yet)
- **Comprehensive documentation** and examples
- **Build-time optimization** for bundle size

This architecture transforms the SDK from a tightly-coupled system into a loosely-coupled, domain-driven architecture that's much easier to maintain, test, and extend while keeping the public API simple and familiar for consumers. 
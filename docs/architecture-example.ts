/**
 * Practical Example: Connection Domain Implementation
 * 
 * This shows how the proposed architecture would look for the Connection bounded context,
 * demonstrating the separation of concerns and dependency injection patterns.
 */

// ===== DOMAIN LAYER =====

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

// domain/connection/value-objects/connection-state.value-object.ts
export enum ConnectionStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting', 
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    FAILED = 'failed'
}

export class ConnectionState {
    constructor(
        private readonly status: ConnectionStatus,
        private readonly attempt: number = 0,
        private readonly lastError?: Error
    ) {}

    get currentStatus(): ConnectionStatus {
        return this.status;
    }

    get reconnectAttempt(): number {
        return this.attempt;
    }

    connecting(): ConnectionState {
        return new ConnectionState(ConnectionStatus.CONNECTING, this.attempt + 1);
    }

    connected(): ConnectionState {
        return new ConnectionState(ConnectionStatus.CONNECTED, 0);
    }

    disconnected(): ConnectionState {
        return new ConnectionState(ConnectionStatus.DISCONNECTED, 0);
    }

    failed(error: Error): ConnectionState {
        return new ConnectionState(ConnectionStatus.FAILED, this.attempt, error);
    }

    allowsReconnection(): boolean {
        return this.status === ConnectionStatus.DISCONNECTED || 
               this.status === ConnectionStatus.FAILED;
    }
}

// domain/connection/entities/connection.entity.ts
export class ConnectionEntity {
    constructor(
        private readonly id: InstanceId,
        private state: ConnectionState,
        private readonly config: {
            autoReconnect: boolean;
            maxReconnectAttempts: number;
            reconnectInterval: number;
        }
    ) {}

    get instanceId(): InstanceId {
        return this.id;
    }

    get currentState(): ConnectionState {
        return this.state;
    }

    canConnect(): boolean {
        return this.state.currentStatus === ConnectionStatus.DISCONNECTED;
    }

    canReconnect(): boolean {
        return this.state.allowsReconnection() && 
               this.config.autoReconnect &&
               this.state.reconnectAttempt < this.config.maxReconnectAttempts;
    }

    initiateConnection(): void {
        if (!this.canConnect()) {
            throw new Error(`Cannot connect from state: ${this.state.currentStatus}`);
        }
        this.state = this.state.connecting();
    }

    markConnected(): void {
        this.state = this.state.connected();
    }

    markDisconnected(): void {
        this.state = this.state.disconnected();
    }

    markFailed(error: Error): void {
        this.state = this.state.failed(error);
    }
}

// domain/connection/events/connection.events.ts
export abstract class ConnectionDomainEvent {
    constructor(
        public readonly eventId: string,
        public readonly connectionId: InstanceId,
        public readonly occurredOn: Date = new Date()
    ) {}
}

export class ConnectionInitiatedEvent extends ConnectionDomainEvent {}
export class ConnectionEstablishedEvent extends ConnectionDomainEvent {}
export class ConnectionFailedEvent extends ConnectionDomainEvent {
    constructor(
        eventId: string,
        connectionId: InstanceId,
        public readonly error: Error,
        occurredOn?: Date
    ) {
        super(eventId, connectionId, occurredOn);
    }
}

// domain/connection/interfaces/connection.repository.ts
export interface IConnectionRepository {
    findById(id: InstanceId): Promise<ConnectionEntity>;
    save(connection: ConnectionEntity): Promise<void>;
    delete(id: InstanceId): Promise<void>;
}

// domain/connection/services/connection.domain-service.ts
export class ConnectionDomainService {
    shouldAttemptReconnection(connection: ConnectionEntity): boolean {
        return connection.canReconnect();
    }

    calculateReconnectDelay(connection: ConnectionEntity): number {
        const baseDelay = 1000; // 1 second
        const attempt = connection.currentState.reconnectAttempt;
        return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
    }
}

// ===== APPLICATION LAYER =====

// application/interfaces/transport.interface.ts
export interface ITransportService {
    establish(connection: ConnectionEntity): Promise<void>;
    terminate(connectionId: InstanceId): Promise<void>;
    isConnected(connectionId: InstanceId): boolean;
}

// application/interfaces/event-bus.interface.ts
export interface IEventBus {
    publish(event: ConnectionDomainEvent): Promise<void>;
    subscribe<T extends ConnectionDomainEvent>(
        eventType: string,
        handler: (event: T) => void
    ): void;
}

// application/use-cases/connection/connect-socket.use-case.ts
export class ConnectSocketUseCase {
    constructor(
        private readonly connectionRepo: IConnectionRepository,
        private readonly transportService: ITransportService,
        private readonly eventBus: IEventBus,
        private readonly domainService: ConnectionDomainService
    ) {}

    async execute(connectionId: InstanceId): Promise<void> {
        // 1. Load connection entity
        const connection = await this.connectionRepo.findById(connectionId);

        // 2. Validate business rules
        if (!connection.canConnect()) {
            throw new Error(`Connection ${connectionId.value} cannot connect in current state`);
        }

        // 3. Update domain state
        connection.initiateConnection();

        // 4. Publish domain event
        await this.eventBus.publish(
            new ConnectionInitiatedEvent(
                crypto.randomUUID(),
                connectionId
            )
        );

        try {
            // 5. Execute infrastructure operation
            await this.transportService.establish(connection);

            // 6. Update domain state on success
            connection.markConnected();
            
            // 7. Publish success event
            await this.eventBus.publish(
                new ConnectionEstablishedEvent(
                    crypto.randomUUID(),
                    connectionId
                )
            );

        } catch (error) {
            // 8. Handle failure
            connection.markFailed(error as Error);
            
            await this.eventBus.publish(
                new ConnectionFailedEvent(
                    crypto.randomUUID(),
                    connectionId,
                    error as Error
                )
            );
            
            throw error;
        } finally {
            // 9. Persist changes
            await this.connectionRepo.save(connection);
        }
    }
}

// application/use-cases/connection/handle-reconnection.use-case.ts
export class HandleReconnectionUseCase {
    constructor(
        private readonly connectionRepo: IConnectionRepository,
        private readonly connectUseCase: ConnectSocketUseCase,
        private readonly domainService: ConnectionDomainService
    ) {}

    async execute(connectionId: InstanceId): Promise<void> {
        const connection = await this.connectionRepo.findById(connectionId);

        if (!this.domainService.shouldAttemptReconnection(connection)) {
            return; // Exit early if reconnection not needed
        }

        const delay = this.domainService.calculateReconnectDelay(connection);
        
        // Wait before reconnecting
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            await this.connectUseCase.execute(connectionId);
        } catch (error) {
            // Reconnection failed - potentially schedule another attempt
            console.error(`Reconnection attempt failed for ${connectionId.value}:`, error);
        }
    }
}

// ===== INFRASTRUCTURE LAYER =====

// infrastructure/repositories/connection.repository.impl.ts
export class InMemoryConnectionRepository implements IConnectionRepository {
    private connections = new Map<string, ConnectionEntity>();

    async findById(id: InstanceId): Promise<ConnectionEntity> {
        const connection = this.connections.get(id.value);
        if (!connection) {
            throw new Error(`Connection ${id.value} not found`);
        }
        return connection;
    }

    async save(connection: ConnectionEntity): Promise<void> {
        this.connections.set(connection.instanceId.value, connection);
    }

    async delete(id: InstanceId): Promise<void> {
        this.connections.delete(id.value);
    }
}

// infrastructure/transport/websocket.transport-service.ts
export class WebSocketTransportService implements ITransportService {
    private connections = new Map<string, WebSocket>();

    async establish(connection: ConnectionEntity): Promise<void> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket('wss://api.qpub.io/ws');
            
            ws.onopen = () => {
                this.connections.set(connection.instanceId.value, ws);
                resolve();
            };

            ws.onerror = (error) => {
                reject(new Error('WebSocket connection failed'));
            };

            // Set timeout for connection
            setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    async terminate(connectionId: InstanceId): Promise<void> {
        const ws = this.connections.get(connectionId.value);
        if (ws) {
            ws.close();
            this.connections.delete(connectionId.value);
        }
    }

    isConnected(connectionId: InstanceId): boolean {
        const ws = this.connections.get(connectionId.value);
        return ws?.readyState === WebSocket.OPEN;
    }
}

// ===== SHARED LAYER (DI Container) =====

// shared/dependency-injection/container.ts
class DIContainer {
    private services = new Map<string, any>();
    private singletons = new Map<string, any>();

    register<T>(token: string, implementation: T): void {
        this.services.set(token, implementation);
    }

    registerSingleton<T>(token: string, factory: () => T): void {
        this.services.set(token, factory);
    }

    resolve<T>(token: string): T {
        if (this.singletons.has(token)) {
            return this.singletons.get(token);
        }

        const factory = this.services.get(token);
        if (!factory) {
            throw new Error(`Service ${token} not registered`);
        }

        if (typeof factory === 'function') {
            const instance = factory();
            this.singletons.set(token, instance);
            return instance;
        }

        return factory;
    }
}

// ===== INTERFACE LAYER (Public SDK) =====

// interface/sdk/qpub-socket.sdk.ts
export class QPubSocket {
    private container: DIContainer;
    private connectionId: InstanceId;

    constructor(options: { apiKey: string }) {
        this.container = this.setupDI(options);
        this.connectionId = new InstanceId(`socket_${crypto.randomUUID()}`);
        this.initializeConnection();
    }

    async connect(): Promise<void> {
        const connectUseCase = this.container.resolve<ConnectSocketUseCase>('ConnectSocketUseCase');
        await connectUseCase.execute(this.connectionId);
    }

    private setupDI(options: { apiKey: string }): DIContainer {
        const container = new DIContainer();

        // Register repositories
        container.registerSingleton('ConnectionRepository', () => new InMemoryConnectionRepository());

        // Register services  
        container.registerSingleton('TransportService', () => new WebSocketTransportService());
        container.register('ConnectionDomainService', new ConnectionDomainService());

        // Register use cases
        container.registerSingleton('ConnectSocketUseCase', () => {
            return new ConnectSocketUseCase(
                container.resolve('ConnectionRepository'),
                container.resolve('TransportService'),
                container.resolve('EventBus'),
                container.resolve('ConnectionDomainService')
            );
        });

        return container;
    }

    private initializeConnection(): void {
        // Create initial connection entity
        const connection = new ConnectionEntity(
            this.connectionId,
            new ConnectionState(ConnectionStatus.DISCONNECTED),
            {
                autoReconnect: true,
                maxReconnectAttempts: 5,
                reconnectInterval: 1000
            }
        );

        // Save initial state
        const repo = this.container.resolve<IConnectionRepository>('ConnectionRepository');
        repo.save(connection);
    }
}

// ===== USAGE EXAMPLE =====

// Example: How consumers would use the new architecture
async function exampleUsage() {
    // Simple, familiar API for consumers
    const socket = new QPubSocket({ apiKey: 'your-api-key' });
    
    try {
        await socket.connect();
        console.log('Connected successfully!');
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

/**
 * Benefits Demonstrated:
 * 
 * 1. ✅ **Separation of Concerns**: Domain logic separate from infrastructure
 * 2. ✅ **Testability**: Each component can be tested in isolation
 * 3. ✅ **Dependency Injection**: No more singleton anti-pattern
 * 4. ✅ **Rich Domain Model**: Business rules enforced in entities
 * 5. ✅ **Event-Driven**: Domain events for loose coupling
 * 6. ✅ **Clean API**: Consumer interface remains simple
 * 7. ✅ **Type Safety**: Strong typing throughout
 * 8. ✅ **Error Handling**: Proper error propagation and handling
 */ 
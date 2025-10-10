# Instance ID Access

Each `Socket` and `Rest` instance has a unique instance ID that can be accessed from the consumer side. This is useful for debugging, logging, and tracking multiple instances.

## Core SDK Usage

### Socket Instance

```typescript
import { Socket } from 'qpub';

const socket = new Socket({
    apiKey: 'your-api-key',
    authUrl: 'https://your-auth-url.com'
});

// Get the instance ID
const instanceId = socket.getInstanceId();
console.log('Socket instance ID:', instanceId);
// Output: Socket instance ID: socket_01j9h7g2k3m4n5p6q7r8s9t0
```

### Rest Instance

```typescript
import { Rest } from 'qpub';

const rest = new Rest({
    apiKey: 'your-api-key'
});

// Get the instance ID
const instanceId = rest.getInstanceId();
console.log('Rest instance ID:', instanceId);
// Output: Rest instance ID: rest_01j9h7g2k3m4n5p6q7r8s9t0
```

## React Integration Usage

The `instanceId` is automatically exposed through the React context for easy access in your components.

### Using the useSocketContext Hook

```typescript
import { useSocketContext } from 'qpub/react';

function MyComponent() {
    const { socket, instanceId } = useSocketContext();
    
    console.log('Current socket instance ID:', instanceId);
    
    // Use instanceId for logging, debugging, or tracking
    useEffect(() => {
        console.log(`[${instanceId}] Component mounted`);
        
        return () => {
            console.log(`[${instanceId}] Component unmounted`);
        };
    }, [instanceId]);
    
    return <div>Instance ID: {instanceId}</div>;
}
```

### Using with SocketProvider

```typescript
import { SocketProvider, useSocketContext } from 'qpub/react';

function App() {
    return (
        <SocketProvider options={{ apiKey: 'your-api-key' }}>
            <InstanceTracker />
        </SocketProvider>
    );
}

function InstanceTracker() {
    const { instanceId } = useSocketContext();
    
    return (
        <div className="debug-panel">
            <h3>Debug Info</h3>
            <p>Instance: {instanceId}</p>
        </div>
    );
}
```

## Use Cases

### 1. Debug Logging

```typescript
function MyComponent() {
    const { socket, instanceId } = useSocketContext();
    const channel = socket.channels.get('my-channel');
    
    useEffect(() => {
        const handleMessage = (message) => {
            console.log(`[${instanceId}] Received message:`, message);
        };
        
        channel.subscribe(handleMessage);
        return () => channel.unsubscribe();
    }, [channel, instanceId]);
}
```

### 2. Multi-Instance Management

```typescript
function MultiInstanceApp() {
    const [instances, setInstances] = useState<string[]>([]);
    
    return (
        <div>
            <SocketProvider options={{ clientId: 'client-1' }}>
                <InstanceTracker onMount={(id) => setInstances(prev => [...prev, id])} />
            </SocketProvider>
            
            <SocketProvider options={{ clientId: 'client-2' }}>
                <InstanceTracker onMount={(id) => setInstances(prev => [...prev, id])} />
            </SocketProvider>
            
            <div>Active instances: {instances.join(', ')}</div>
        </div>
    );
}

function InstanceTracker({ onMount }: { onMount: (id: string) => void }) {
    const { instanceId } = useSocketContext();
    
    useEffect(() => {
        onMount(instanceId);
    }, [instanceId, onMount]);
    
    return null;
}
```

### 3. Error Reporting with Context

```typescript
function ErrorBoundaryWithContext() {
    const { instanceId } = useSocketContext();
    
    const reportError = (error: Error) => {
        // Include instance ID in error reports
        errorReporter.log({
            message: error.message,
            stack: error.stack,
            instanceId: instanceId,
            timestamp: Date.now()
        });
    };
    
    return <ErrorBoundary onError={reportError}>
        <YourApp />
    </ErrorBoundary>;
}
```

## Instance ID Format

Instance IDs follow the UUIDv7 format with a prefix:
- Socket instances: `socket_<uuidv7>`
- Rest instances: `rest_<uuidv7>`

Example: `socket_01j9h7g2k3m4n5p6q7r8s9t0`

The UUIDv7 format provides:
- **Time-ordered**: IDs are sortable by creation time
- **Unique**: Collision-resistant across distributed systems
- **Debugging-friendly**: Prefix indicates the instance type

## Best Practices

1. **Use for logging**: Include instance ID in all logs for easier debugging
2. **Don't use as security token**: The instance ID is not secret and should not be used for authentication
3. **Track lifecycle**: Use instance ID to track the lifecycle of socket instances in complex applications
4. **Multi-instance scenarios**: When running multiple instances, use instance ID to differentiate them

## Testing

Tests are available in `__tests__/unit/socket-rest-instance-id.test.ts` and `__tests__/integration/instance-id.test.ts`.

Run the tests:
```bash
npm test -- instance-id
```

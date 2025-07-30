# Type-Safe Connection Event Handling with QPub

This example demonstrates how consumers can use the exposed event types for fully type-safe event handling with `ConnectionEvents`.

## Import the Required Types

```typescript
import { 
    QPub, 
    ConnectionEvents, 
    ConnectionEventPayloads, 
    ConnectionEventListener,
    EventListener 
} from 'qpub';
```

## What You Get

### 🔧 Runtime Constants
- `ConnectionEvents.CONNECTED` - for event registration
- `ConnectionEvents.FAILED` - for error handling  
- `ConnectionEvents.CONNECTING` - for connection state tracking
- All other connection events...

### 📝 Type Definitions
- `ConnectionEventPayloads` - payload structure for each event
- `ConnectionEventListener<K>` - type-safe event listener helpers
- `EventListener<T>` - generic event listener type

## Usage Examples

### 1. Basic Event Handling with Runtime Constants

```typescript
const socket = QPub.Socket({ apiKey: "your-api-key" });

// ✅ Using constants prevents typos and provides IntelliSense
socket.connection.on(ConnectionEvents.CONNECTED, (data) => {
    console.log("Connected with ID:", data.connectionId);
    console.log("Connection details:", data.connectionDetails);
});

socket.connection.on(ConnectionEvents.FAILED, (data) => {
    console.error("Connection failed:", data.error.message);
    console.log("Failure context:", data.context);
});
```

### 2. Type-Safe Event Listener Definitions

```typescript
// ✅ Fully typed event handlers
const handleConnected: ConnectionEventListener<'connected'> = (payload) => {
    // payload is fully typed as ConnectionEventPayloads['connected']
    console.log(`✅ Connected! ID: ${payload.connectionId}`);
    
    if (payload.connectionDetails) {
        console.log(`Server ID: ${payload.connectionDetails.serverId}`);
        console.log(`Client ID: ${payload.connectionDetails.clientId}`);
    }
};

const handleFailed: ConnectionEventListener<'failed'> = (payload) => {
    // payload is fully typed as ConnectionEventPayloads['failed']  
    console.error(`💥 Connection failed in context: ${payload.context}`);
    console.error(`Error: ${payload.error.message}`);
    
    // TypeScript knows error can be Error or ErrorInfo
    if ('code' in payload.error) {
        console.error(`Error code: ${payload.error.code}`);
        console.error(`Status code: ${payload.error.statusCode}`);
    }
};

// Register the type-safe event listeners
socket.connection.on(ConnectionEvents.CONNECTED, handleConnected);
socket.connection.on(ConnectionEvents.FAILED, handleFailed);
```

### 3. Generic Event Listener Factory

```typescript
// ✅ Create type-safe listeners dynamically
const createTypedListener = <K extends keyof ConnectionEventPayloads>(
    eventName: K
): EventListener<ConnectionEventPayloads[K]> => {
    return (payload) => {
        console.log(`Event ${String(eventName)} triggered with payload:`, payload);
        // payload is correctly typed based on K
    };
};

// Usage with full type safety
const connectingListener = createTypedListener('connecting');
const openedListener = createTypedListener('opened');

socket.connection.on(ConnectionEvents.CONNECTING, connectingListener);
socket.connection.on(ConnectionEvents.OPENED, openedListener);
```

### 4. Connection State Management Class

```typescript
class ConnectionManager {
    private connection = socket.connection;
    private isConnected = false;
    private reconnectAttempts = 0;

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Type-safe event handlers with proper payload types
        this.connection.on(ConnectionEvents.CONNECTING, this.handleConnecting.bind(this));
        this.connection.on(ConnectionEvents.CONNECTED, this.handleConnected.bind(this));
        this.connection.on(ConnectionEvents.DISCONNECTED, this.handleDisconnected.bind(this));
        this.connection.on(ConnectionEvents.FAILED, this.handleFailed.bind(this));
    }

    private handleConnecting: ConnectionEventListener<'connecting'> = (payload) => {
        console.log(`🔄 Connecting... (attempt ${payload.attempt})`);
        this.reconnectAttempts = payload.attempt;
    };

    private handleConnected: ConnectionEventListener<'connected'> = (payload) => {
        console.log(`✅ Connected! ID: ${payload.connectionId}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
    };

    private handleFailed: ConnectionEventListener<'failed'> = (payload) => {
        console.error(`💥 Connection failed: ${payload.error.message}`);
        console.error(`Context: ${payload.context}`);
        this.isConnected = false;
        
        // Handle different failure contexts
        switch (payload.context) {
            case 'websocket':
                console.log('WebSocket connection issue - will retry');
                break;
            case 'authentication':
                console.log('Authentication failed - check credentials');
                break;
            case 'reconnection':
                console.log('Reconnection failed - stopping attempts');
                break;
            default:
                console.log('Unknown failure context');
        }
    };

    public getConnectionStatus(): boolean {
        return this.isConnected;
    }
}
```

### 5. Event Handling with Conditional Logic

```typescript
socket.connection.on(ConnectionEvents.CONNECTING, (payload) => {
    // payload: { attempt: number; url?: string }
    if (payload.attempt > 1) {
        console.log(`Reconnection attempt #${payload.attempt}`);
    } else {
        console.log("Initial connection attempt");
    }
    
    if (payload.url) {
        console.log(`Connecting to: ${payload.url}`);
    }
});
```

## Available Connection Event Types

| Event | Payload Type | Description |
|-------|-------------|-------------|
| `INITIALIZED` | `void` | Connection instance created |
| `CONNECTING` | `{ attempt: number; url?: string }` | Connection attempt starting |
| `OPENED` | `{ connectionId?: string }` | WebSocket connection opened |
| `CONNECTED` | `{ connectionId: string; connectionDetails?: ConnectionDetails }` | Fully connected |
| `DISCONNECTED` | `{ reason?: string; code?: number }` | Disconnected from server |
| `CLOSING` | `{ reason?: string }` | Connection is closing |
| `CLOSED` | `{ code?: number; reason?: string; wasClean?: boolean }` | Connection closed |
| `FAILED` | `{ error: Error \| ErrorInfo; context?: string }` | Connection failed |

## Benefits

✅ **Compile-time Safety** - TypeScript catches event name typos and payload mismatches  
✅ **IntelliSense Support** - Full autocompletion for event names and payload properties  
✅ **Self-documenting** - Event payload types serve as live documentation  
✅ **Refactoring Safe** - Changes to event structures are caught at compile time  
✅ **Consistent API** - Same patterns work for `ChannelEvents` and `AuthEvents`

## Similar Patterns for Other Events

The same pattern works for channel and auth events:

```typescript
import { 
    ChannelEvents, 
    ChannelEventPayloads, 
    ChannelEventListener,
    AuthEvents,
    AuthEventPayloads,
    AuthEventListener
} from 'qpub';

// Channel events
const handleChannelSubscribed: ChannelEventListener<'subscribed'> = (payload) => {
    console.log(`Subscribed to ${payload.channelName} with ID: ${payload.subscriptionId}`);
};

// Auth events  
const handleTokenUpdated: AuthEventListener<'token_updated'> = (payload) => {
    console.log(`Token updated, expires at: ${payload.expiresAt}`);
};
``` 
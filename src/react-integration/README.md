# QPub React Integration

React hooks and components for QPub real-time messaging SDK.

## Installation

```bash
npm install qpub react
```

## Quick Start

QPub React integration offers two approaches for channel subscriptions:

- **🚀 Auto-Subscribe** (Recommended): Use `onMessage` option for automatic subscription management
- **⚙️ Manual Control**: Use `subscribe()` method for fine-grained control

### 1. Basic Setup (Auto-Subscribe)

```tsx
import React, { useState, useCallback, useEffect } from "react";
import { SocketProvider, useChannel, Message } from "qpub/react";

function App() {
    return (
        <SocketProvider options={{ apiKey: "your-api-key" }}>
            <ChatRoom />
        </SocketProvider>
    );
}

function ChatRoom() {
    const [messages, setMessages] = useState<Message[]>([]);

    // Handle incoming messages
    const handleMessage = useCallback((message: Message) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    // Auto-subscribe when ready (connection + channel both ready)
    const { publish, isSubscribed, ready } = useChannel("chat-room", {
        onMessage: handleMessage,
    });

    const sendMessage = () => {
        publish({ text: "Hello from React!", timestamp: Date.now() });
    };

    return (
        <div>
            <div>Status: {ready ? "Ready & Subscribed" : "Not ready"}</div>

            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index}>{JSON.stringify(msg)}</div>
                ))}
            </div>

            <button onClick={sendMessage} disabled={!ready}>
                Send Message
            </button>
        </div>
    );
}
```

### 2. Manual Subscription (Advanced)

For more control over subscription timing:

```tsx
function AdvancedChatRoom() {
    const [messages, setMessages] = useState<Message[]>([]);
    const { subscribe, publish, ready, status } = useChannel("chat-room");
    const { status: connectionStatus } = useConnection();

    // Handle incoming messages
    const handleMessage = useCallback((message: Message) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    // Manual subscription control
    useEffect(() => {
        if (ready) {
            subscribe(handleMessage);
        }
    }, [ready, subscribe, handleMessage]);

    return (
        <div>
            <div>Connection: {connectionStatus}</div>
            <div>Channel: {status}</div>
            <div>Ready: {ready ? "✅" : "❌"}</div>
            {/* ... rest of component */}
        </div>
    );
}
```

### 3. Authentication & Connection Details

```tsx
import { useAuth, useConnection } from "qpub/react";

function AuthenticatedChat() {
    const { isAuthenticated, authenticate, error } = useAuth();
    const {
        status: connectionStatus,
        connectionId,
        connectionDetails,
    } = useConnection();

    if (!isAuthenticated) {
        return (
            <div>
                <button onClick={authenticate}>Login</button>
                {error && <div>Error: {error.message}</div>}
            </div>
        );
    }

    return (
        <div>
            <div>Connection: {connectionStatus}</div>
            {connectionId && (
                <div>
                    <div>Connection ID: {connectionId}</div>
                    {connectionDetails && (
                        <>
                            <div>Alias: {connectionDetails.alias}</div>
                            <div>Client ID: {connectionDetails.client_id}</div>
                            <div>Server ID: {connectionDetails.server_id}</div>
                        </>
                    )}
                </div>
            )}
            <ChatRoom />
        </div>
    );
}
```

### 3. Channel Component Pattern

```tsx
import { Channel } from "qpub/react";

function App() {
    return (
        <SocketProvider options={{ apiKey: "your-api-key" }}>
            <Channel name="notifications">
                {({ status, publish, isSubscribed }) => (
                    <div>
                        <div>Status: {status}</div>
                        <button
                            onClick={() => publish({ type: "ping" })}
                            disabled={!isSubscribed()}
                        >
                            Send Notification
                        </button>
                    </div>
                )}
            </Channel>
        </SocketProvider>
    );
}
```

## API Reference

### Components

#### `<SocketProvider>`

Provides Socket instance to child components.

```tsx
interface SocketProviderProps {
    children: React.ReactNode;
    options?: Partial<Option>; // QPub SDK options
    fallback?: React.ComponentType<{ error?: Error }>;
}
```

#### `<Channel>`

Render prop component for channel management.

```tsx
interface ChannelProps {
    name: string;
    children: (state: UseChannelReturn) => React.ReactNode;
}
```

### Hooks

#### `useChannel(channelName, options?)`

Manages Socket channel with direct SDK method exposure.

```tsx
const {
    // SDK instance
    channel, // SocketChannel instance

    // State
    status, // 'initialized' | 'subscribing' | 'subscribed' | 'unsubscribing' | 'unsubscribed' | 'failed'
    error,
    ready, // boolean - true when both connection and channel are ready

    // SDK methods (exposed directly)
    subscribe, // (callback: (message: Message) => void) => void
    unsubscribe, // () => void
    resubscribe, // () => Promise<void>
    publish, // (data: any, event?: string, alias?: string) => Promise<void>
    isSubscribed, // () => boolean
    isPendingSubscribe, // () => boolean
    setPendingSubscribe, // (pending: boolean) => void
    reset, // () => void
    getName, // () => string
} = useChannel("channel-name", {
    onMessage: (message: Message) => void, // Auto-subscribe when ready
});
```

#### `useAuth()`

Manages authentication with Socket interface.

```tsx
const {
    // State
    token,
    isAuthenticated,
    isAuthenticating,
    error,

    // Core methods
    authenticate, // () => Promise<AuthResponse | null>
    clearToken, // () => void
    shouldAutoAuthenticate, // () => boolean
    getAuthHeaders, // () => HeadersInit
    getAuthQueryParams, // () => string
    getAuthenticateUrl, // (baseUrl: string) => string
    requestToken, // (request: TokenRequest) => Promise<AuthResponse>
} = useAuth();
```

#### `useConnection()`

Monitors Socket connection state and provides connection details.

```tsx
const {
    // State
    status, // 'initialized' | 'connecting' | 'opened' | 'connected' | 'disconnected' | 'closing' | 'closed' | 'failed'
    connectionId, // string | null - Unique connection identifier
    connectionDetails, // ConnectionDetails | null - { alias: string, client_id: string, server_id: string }

    // Core methods
    connect, // () => Promise<void>
    disconnect, // () => void
    isConnected, // () => boolean
    ping, // () => Promise<number>
    reset, // () => void
} = useConnection();
```

## Advanced Usage

### Multiple Channels with Auto-Subscribe

```tsx
function MultiChannelComponent() {
    // Auto-subscribe approach (recommended)
    const notifications = useChannel("notifications", {
        onMessage: (msg: Message) => showNotification(msg),
    });
    const chat = useChannel("chat-room", {
        onMessage: (msg: Message) => addChatMessage(msg),
    });
    const events = useChannel("system-events", {
        onMessage: (msg: Message) => logSystemEvent(msg),
    });

    return (
        <div>
            <div>Notifications: {notifications.ready ? "✅" : "⏳"}</div>
            <div>Chat: {chat.ready ? "✅" : "⏳"}</div>
            <div>Events: {events.ready ? "✅" : "⏳"}</div>
        </div>
    );
}
```

### Multiple Channels with Manual Control

```tsx
function ManualMultiChannelComponent() {
    const notifications = useChannel("notifications");
    const chat = useChannel("chat-room");
    const events = useChannel("system-events");

    useEffect(() => {
        // Manual subscription control
        if (notifications.ready) {
            notifications.subscribe((msg: Message) => showNotification(msg));
        }
        if (chat.ready) {
            chat.subscribe((msg: Message) => addChatMessage(msg));
        }
        if (events.ready) {
            events.subscribe((msg: Message) => logSystemEvent(msg));
        }
    }, [notifications.ready, chat.ready, events.ready]);

    return (
        <div>
            <div>Notifications: {notifications.isSubscribed() ? "✓" : "✗"}</div>
            <div>Chat: {chat.isSubscribed() ? "✓" : "✗"}</div>
            <div>Events: {events.isSubscribed() ? "✓" : "✗"}</div>
        </div>
    );
}
```

## TypeScript Support

Full TypeScript support with strict typing:

```tsx
import {
    UseChannelReturn,
    UseChannelOptions,
    UseAuthReturn,
    UseConnectionReturn,
    SocketProviderProps,
    Message,
    ConnectionDetails,
} from "qpub/react";

// Type-safe usage
const { ready, publish } = useChannel("chat", {
    onMessage: (message: Message) => {
        // message is fully typed
        console.log(message.data);
    },
});

// Connection details are also fully typed
const { connectionId, connectionDetails } = useConnection();
if (connectionDetails) {
    console.log(
        connectionDetails.alias,
        connectionDetails.client_id,
        connectionDetails.server_id
    );
}
```

## Notes

- **Socket-only**: This React integration focuses on real-time Socket functionality
- **Auto-Subscribe**: Use `onMessage` option for automatic subscription management when connection + channel are ready
- **SDK-faithful**: All hooks expose SDK methods directly without abstractions
- **Provider-based**: Use `SocketProvider` for consistent context
- **TypeScript**: Full type safety and IntelliSense support

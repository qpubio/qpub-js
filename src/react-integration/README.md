# QPub React Integration

React hooks and components for QPub real-time messaging SDK.

## Installation

```bash
npm install qpub react
```

## Quick Start

### 1. Basic Setup

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
    const { subscribe, publish, isSubscribed, status } =
        useChannel("chat-room");

    // Handle incoming messages
    const handleMessage = useCallback((message: Message) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    // Subscribe when channel is ready
    useEffect(() => {
        if (status === "initialized") {
            subscribe(handleMessage);
        }
    }, [status, subscribe, handleMessage]);

    const sendMessage = () => {
        publish({ text: "Hello from React!", timestamp: Date.now() });
    };

    return (
        <div>
            <div>
                Channel: {isSubscribed() ? "Subscribed" : "Not subscribed"}
            </div>

            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index}>{JSON.stringify(msg)}</div>
                ))}
            </div>

            <button onClick={sendMessage} disabled={!isSubscribed()}>
                Send Message
            </button>
        </div>
    );
}
```

### 2. Authentication

```tsx
import { useAuth, useConnection } from "qpub/react";

function AuthenticatedChat() {
    const { isAuthenticated, authenticate, error } = useAuth();
    const { status: connectionStatus } = useConnection();

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

#### `useChannel(channelName)`

Manages Socket channel with direct SDK method exposure.

```tsx
const {
    // SDK instance
    channel, // SocketChannel instance

    // State
    status, // 'initialized' | 'subscribing' | 'subscribed' | 'unsubscribing' | 'unsubscribed' | 'failed'
    error,

    // SDK methods (exposed directly)
    subscribe, // (callback: (message: Message) => void) => void
    unsubscribe, // () => void
    resubscribe, // () => Promise<void>
    publish, // (data: any, event?: string, clientId?: string) => Promise<void>
    isSubscribed, // () => boolean
    isPendingSubscribe, // () => boolean
    setPendingSubscribe, // (pending: boolean) => void
    reset, // () => void
    getName, // () => string
} = useChannel("channel-name", {
    autoSubscribe: boolean,
    suspense: boolean,
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

Monitors Socket connection state.

```tsx
const {
    status, // 'initialized' | 'connecting' | 'opened' | 'connected' | 'disconnected' | 'closing' | 'closed' | 'failed'
    connect, // () => Promise<void>
    disconnect, // () => void
    isConnected, // () => boolean
    reset, // () => void
} = useConnection();
```

## Advanced Usage

### Multiple Channels

```tsx
function MultiChannelComponent() {
    const notifications = useChannel("notifications");
    const chat = useChannel("chat-room");
    const events = useChannel("system-events");

    useEffect(() => {
        // Subscribe to different channels with different handlers
        notifications.subscribe((msg: Message) => showNotification(msg));
        chat.subscribe((msg: Message) => addChatMessage(msg));
        events.subscribe((msg: Message) => logSystemEvent(msg));
    }, []);

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
    UseAuthReturn,
    UseConnectionReturn,
    SocketProviderProps,
} from "qpub/react";
```

## Notes

-   **Socket-only**: This React integration focuses on real-time Socket functionality
-   **SDK-faithful**: All hooks expose SDK methods directly without abstractions
-   **Provider-based**: Use `SocketProvider` for consistent context
-   **TypeScript**: Full type safety and IntelliSense support

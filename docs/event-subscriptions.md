# Event-Specific Subscriptions

## Overview

The SDK supports event-specific subscriptions through the `subscribe` and `unsubscribe` methods. You can:

1. **Subscribe to all messages** - No event specified, receives everything
2. **Subscribe to specific events** - Target specific event names, can have multiple callbacks per event
3. **Mix both approaches** - Subscribe to specific events while also having a catch-all subscription

This provides a flexible, unified API for handling messages on channels.

## Basic Usage

### Subscribe to All Messages

```typescript
import { QPub } from "@qpub/sdk";

const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
const channel = socket.channels.get("my-channel");

// Subscribe without event option - receives all messages
channel.subscribe((message) => {
    console.log("Received message:", message);
    // This will be called for all messages
});
```

### Subscribe to Specific Events

```typescript
import { QPub } from "@qpub/sdk";

const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
const channel = socket.channels.get("my-channel");

// Subscribe to specific event
channel.subscribe(
    (message) => {
        console.log("User logged in:", message.data);
    },
    { event: "user-login" }
);

// Subscribe to another event with a different callback
channel.subscribe(
    (message) => {
        console.log("User logged out:", message.data);
    },
    { event: "user-logout" }
);
```

### Multiple Callbacks for the Same Event

```typescript
const handleLoginUI = (message) => {
    console.log("Update UI:", message.data);
};

const logLoginAnalytics = (message) => {
    console.log("Log analytics:", message.data);
};

// Both callbacks will be called for "user-login" events
channel.subscribe(handleLoginUI, { event: "user-login" });
channel.subscribe(logLoginAnalytics, { event: "user-login" });
```

### Unsubscribe from Events

```typescript
// Unsubscribe specific callback from specific event
channel.unsubscribe(handleLoginUI, { event: "user-login" });

// Unsubscribe all callbacks from specific event
channel.unsubscribe(undefined, { event: "user-login" });

// Unsubscribe from entire channel (removes all event subscriptions)
channel.unsubscribe();
```

### Async Usage (Optional)

Both `subscribe()` and `unsubscribe()` return Promises, so you can use them with or without `await`:

```typescript
// Fire-and-forget (no await) - just like before
channel.subscribe((message) => {
    console.log("Received:", message);
});

// Wait for subscription confirmation (with await)
await channel.subscribe((message) => {
    console.log("Received:", message);
});
console.log("Subscription confirmed!");

// Same for unsubscribe
await channel.unsubscribe();
console.log("Unsubscribed!");

// Custom timeout (default is 10 seconds)
try {
    await channel.subscribe(
        (message) => console.log(message),
        { event: "user-login", timeout: 5000 }
    );
} catch (error) {
    console.error("Subscription failed or timed out:", error);
}
```

The async methods are useful when you need:
- Confirmation before proceeding with other operations
- Error handling with try/catch instead of event listeners
- Sequential subscription setup in async functions

## How It Works

### Message Routing

When an event-specific subscription is active:

- Only messages with a matching `event` property will be delivered to the callback
- Messages without an `event` property will be ignored
- Messages with a different `event` value will be ignored

Example server message:

```json
{
    "action": 10,
    "id": "msg-123",
    "timestamp": "2024-01-01T00:00:00Z",
    "channel": "my-channel",
    "messages": [
        { "event": "user-login", "data": { "userId": 1 } }, // ✅ Delivered to user-login callbacks
        { "event": "user-logout", "data": { "userId": 2 } }, // ✅ Delivered to user-logout callbacks
        { "data": { "userId": 3 } } // ❌ Filtered out (no event)
    ]
}
```

### Subscription Behavior

**Multiple Event Subscriptions:**
When you subscribe to multiple events, the SDK automatically manages a master callback that routes messages to the appropriate event-specific callbacks:

```typescript
// Subscribe to multiple events
channel.subscribe(callback1, { event: "event-1" });
channel.subscribe(callback2, { event: "event-2" });

// Internally, only one subscription is made to the channel
// Messages are distributed to callbacks based on their event
```

**Catch-all Subscription:**
Subscribing without an event clears all event-specific subscriptions:

```typescript
// These event-specific subscriptions are active
channel.subscribe(callback1, { event: "event-1" });
channel.subscribe(callback2, { event: "event-2" });

// This clears the event subscriptions and replaces them with a catch-all
channel.subscribe(callbackAll); // Now only callbackAll receives all messages
```

**Automatic Unsubscribe:**
When all event callbacks are removed, the channel automatically unsubscribes:

```typescript
channel.subscribe(callback1, { event: "event-1" });
channel.subscribe(callback2, { event: "event-2" });

// Remove all callbacks for event-1
channel.unsubscribe(undefined, { event: "event-1" });

// Remove all callbacks for event-2
// This also triggers a full channel unsubscribe since no events remain
channel.unsubscribe(undefined, { event: "event-2" });
```

### Reconnection Handling

Event-specific subscriptions are automatically preserved during reconnection:

```typescript
// Subscribe to multiple events
channel.subscribe(callback1, { event: "event-1" });
channel.subscribe(callback2, { event: "event-2" });

// If connection is lost and restored, all event subscriptions are automatically restored
// No additional code needed - handled internally by the SDK
```

### Buffered Messages

Event-specific subscriptions also apply to buffered messages when using the pause/resume functionality:

```typescript
const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
const channel = socket.channels.get("my-channel");

// Subscribe to specific event
channel.subscribe(callback, { event: "important" });

// Pause with buffering enabled
channel.pause({ bufferMessages: true });

// Messages are buffered while paused...

// When resumed, only messages matching the subscribed event are delivered
channel.resume();
```

## Use Cases

### 1. Separating Different Message Types

```typescript
const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
const notificationsChannel = socket.channels.get("notifications");

// Handle different notification types with separate callbacks
notificationsChannel.subscribe(
    (message) => {
        showUserNotification(message.data);
    },
    { event: "user-notification" }
);

notificationsChannel.subscribe(
    (message) => {
        showSystemAlert(message.data);
    },
    { event: "system-notification" }
);

notificationsChannel.subscribe(
    (message) => {
        showPromotionBanner(message.data);
    },
    { event: "promotion-notification" }
);
```

### 2. Selective Data Processing

```typescript
const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
const analyticsChannel = socket.channels.get("analytics");

// Only process "page-view" events
analyticsChannel.subscribe(
    (message) => {
        trackPageView(message.data);
    },
    { event: "page-view" }
);
```

### 3. Feature-Specific Subscriptions

```typescript
const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
const gameChannel = socket.channels.get("game-events");

// Handle multiple game events
gameChannel.subscribe(
    (message) => {
        updatePlayerPosition(message.data);
    },
    { event: "player-move" }
);

gameChannel.subscribe(
    (message) => {
        updateScoreboard(message.data);
    },
    { event: "player-score" }
);

gameChannel.subscribe(
    (message) => {
        showGameOverScreen(message.data);
    },
    { event: "game-over" }
);
```

### 4. Cleanup in React Components

```typescript
import { useChannel } from "qpub-react";

function GameComponent() {
    const { subscribe, unsubscribe } = useChannel("game-events");

    useEffect(() => {
        const handlePlayerMove = (message) => {
            console.log("Player moved:", message.data);
        };

        // Subscribe on mount
        subscribe(handlePlayerMove, { event: "player-move" });

        // Unsubscribe on unmount
        return () => {
            unsubscribe(handlePlayerMove, { event: "player-move" });
        };
    }, [subscribe, unsubscribe]);

    return <div>Game UI</div>;
}
```

### 5. Dynamic Event Handling

```typescript
const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
const channel = socket.channels.get("my-channel");

// Add handlers dynamically
const activeHandlers = new Map();

function addEventHandler(eventName, handler) {
    channel.subscribe(handler, { event: eventName });
    activeHandlers.set(eventName, handler);
}

function removeEventHandler(eventName) {
    const handler = activeHandlers.get(eventName);
    if (handler) {
        channel.unsubscribe(handler, { event: eventName });
        activeHandlers.delete(eventName);
    }
}

// Add handlers
addEventHandler("user-login", handleLogin);
addEventHandler("user-logout", handleLogout);

// Remove a specific handler
removeEventHandler("user-login");
```

## Publishing with Events

When publishing messages, specify the event name using the `PublishOptions`:

```typescript
// Publish with event name
await channel.publish(
    { userId: 123, action: "login" },
    { event: "user-login" }
);

// Publish with event and alias
await channel.publish(
    { userId: 456, action: "logout" },
    {
        event: "user-logout",
        alias: "user-session-mgmt",
    }
);
```

## Implementation Details

### Message Processing

- **Client-side routing**: Message routing happens on the client after receiving messages from the server
- **Server still sends all messages**: The server sends all messages for the channel; event-specific routing is done locally
- **No server-side awareness**: Event subscriptions are not sent to the server; they're purely client-side features
- **Performance**: Message routing is very lightweight with minimal overhead

### Subscription Management

- **Single channel subscription**: Only one WebSocket subscription per channel, regardless of how many event-specific callbacks you register
- **Efficient routing**: Messages are routed to the appropriate callbacks based on their event property
- **Automatic cleanup**: When the last event callback is removed, the channel automatically unsubscribes

### API Consistency

- **Unified interface**: `subscribe` and `unsubscribe` handle both catch-all and event-specific subscriptions
- **Options-based**: Consistent with the `publish` method which also uses options
- **Type-safe**: Full TypeScript support with proper types for callbacks and options

## Migration from Manual Event Checking

If you're currently manually checking event names in your callback:

```typescript
// Before
channel.subscribe((message) => {
    if (message.event === "my-event") {
        handleMessage(message);
    }
});

// After
channel.subscribe(handleMessage, { event: "my-event" });
```

Benefits:

- Cleaner code
- Built-in event routing
- Automatic handling during reconnection and pause/resume
- Support for multiple callbacks per event
- Easy cleanup with targeted unsubscribe

## Technical Details: Operation Queue

### How It Works

The SDK maintains an internal operation queue per channel to handle rapid subscribe/unsubscribe calls:

1. **Normal Operation** - When no operations are in-flight, subscribe/unsubscribe execute immediately
2. **Queueing** - When an operation is pending (waiting for server acknowledgment), subsequent operations are queued
3. **Processing** - When the server responds (SUBSCRIBED/UNSUBSCRIBED), the next queued operation executes
4. **Order Guarantee** - Operations always complete in the order they were called

### Event-Specific Optimizations

Event-specific subscriptions have special handling:

- **Adding event callbacks** - If the channel is already subscribed, event callbacks can be added immediately (no queueing needed)
- **Removing event callbacks** - If the channel is subscribed and stable, event callbacks can be removed immediately
- **Full channel operations** - Only queued when they would send a message to the server

This means rapid event switching is extremely efficient:

```typescript
// These all execute immediately (no server messages needed)
channel.subscribe(handler1, { event: "event-1" }); // Channel already subscribed
channel.subscribe(handler2, { event: "event-2" }); // Just adds to callback map
channel.unsubscribe(handler1, { event: "event-1" }); // Just removes from map
```

### State Flags

The SDK tracks two internal flags:

- `pendingSubscribe` - Set when SUBSCRIBE message sent, cleared when SUBSCRIBED received
- `pendingUnsubscribe` - Set when UNSUBSCRIBE message sent, cleared when UNSUBSCRIBED received

Operations check these flags to determine whether to execute immediately or queue.

## Best Practices

1. **Store callbacks in stable references** - Use `useCallback` in React or store in variables to avoid unintended unsubscribes
2. **Clean up subscriptions** - Always unsubscribe when components unmount or channels are no longer needed
3. **Use event-specific subscriptions** - When you only care about certain event types, event-specific subscriptions are more efficient
4. **Avoid mixing patterns** - Choose either catch-all OR event-specific subscriptions, not both simultaneously
5. **No artificial delays needed** - The SDK handles race conditions automatically; don't use `setTimeout` workarounds
6. **Handle errors** - Implement proper error handling for subscription failures
7. **Test subscription lifecycle** - Write tests for subscribe, message handling, and unsubscribe flows

## Notes

- Event-specific subscriptions are optional - you can still subscribe without an event option to receive all messages
- The `event` property in messages is a string
- Event names are case-sensitive
- Empty string `""` is a valid event name and will be matched exactly
- Subscribing without an event (catch-all) will clear any existing event-specific subscriptions
- Event-specific subscriptions are automatically preserved and restored during reconnection

# Channel Pause/Resume Feature

The QPub SDK provides a client-side pause/resume mechanism for channels, allowing you to temporarily stop receiving messages without unsubscribing from the channel. This is useful for scenarios like:

- Temporarily hiding notifications while the app is in background
- Pausing message processing during UI transitions
- Implementing "Do Not Disturb" modes
- Reducing battery usage on mobile devices

## Overview

The pause/resume feature is **purely client-side** and requires no server protocol changes. When a channel is paused:

- Messages still arrive from the server over the WebSocket connection
- Messages are either **buffered** (default) or **dropped** based on your configuration
- The subscription remains active on the server
- No additional network traffic is generated

This approach follows industry standards (used by Ably and other established real-time platforms).

## API Reference

### Core SDK (Socket)

```typescript
// Pause channel with buffering (default)
channel.pause();

// Pause channel without buffering (drop messages)
channel.pause({ bufferMessages: false });

// Resume channel (delivers buffered messages if any)
channel.resume();

// Check if channel is paused
const paused = channel.isPaused();

// Clear buffered messages without resuming
channel.clearBufferedMessages();
```

### React Integration

```typescript
const {
    pause,
    resume,
    paused, // ✅ Reactive state - use this in dependencies
    isPaused, // Function - same as core SDK
    clearBufferedMessages,
} = useChannel("my-channel");

// Control methods
pause(); // Buffer messages (default)
pause({ bufferMessages: false }); // Drop messages
resume(); // Resume and deliver buffered messages
clearBufferedMessages(); // Clear buffer

// Check pause state
console.log(paused); // ✅ Reactive boolean state
console.log(isPaused()); // ✅ Function that returns boolean

// ⚠️ Important: Use `paused` state in useEffect dependencies
useEffect(() => {
    console.log("Pause state changed:", paused);
}, [paused]); // ✅ Correct - reacts to state changes

// NOT this:
useEffect(() => {
    console.log("This will NOT trigger on pause changes:", isPaused());
}, [isPaused]); // ❌ Wrong - only triggers if function reference changes
```

## Events

The SDK emits events when channels are paused or resumed:

```typescript
import { ChannelEvents } from "qpub";

// Listen for pause events
channel.on(ChannelEvents.PAUSED, (payload) => {
    console.log(`Channel ${payload.channelName} paused`);
    console.log(`Buffering enabled: ${payload.buffering}`);
});

// Listen for resume events
channel.on(ChannelEvents.RESUMED, (payload) => {
    console.log(`Channel ${payload.channelName} resumed`);
    console.log(
        `Buffered messages delivered: ${payload.bufferedMessagesDelivered}`
    );
});
```

## Usage Examples

### Example 1: Basic Pause/Resume

```typescript
import { Socket } from "qpub";

const socket = new Socket({
    /* options */
});
await socket.connect();

const channel = socket.getChannel("notifications");

// Subscribe to messages
channel.subscribe((message) => {
    console.log("Received:", message.data);
});

// Pause receiving messages
channel.pause();

// ... time passes, messages are buffered ...

// Resume and receive all buffered messages
channel.resume();
// Output: All buffered messages are delivered at once
```

### Example 2: Drop Messages (No Buffering)

```typescript
// Use this when you don't need missed messages
channel.pause({ bufferMessages: false });

// Messages arriving during pause are dropped
// When you resume, only new messages are received
channel.resume();
```

### Example 3: React Component with Pause on Background

```typescript
import { useChannel } from 'qpub-react';
import { useEffect } from 'react';

function NotificationComponent() {
  const {
    subscribe,
    pause,
    resume,
    paused  // Use reactive state, not isPaused()
  } = useChannel('notifications');

  // Subscribe to messages
  useEffect(() => {
    const handleMessage = (message) => {
      console.log('Notification:', message.data);
    };

    subscribe(handleMessage);
  }, [subscribe]);

  // Pause when document is hidden (tab switch, minimize, etc)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !paused) {
        console.log('App hidden, pausing notifications');
        pause();
      } else if (!document.hidden && paused) {
        console.log('App visible, resuming notifications');
        resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pause, resume, paused]);

  // React to pause state changes
  useEffect(() => {
    console.log('Pause state changed:', paused);
  }, [paused]); // ✅ This will trigger when pause state changes

  return (
    <div>
      <p>Notifications: {paused ? 'Paused' : 'Active'}</p>
    </div>
  );
}
```

### Example 4: Manual Buffer Management

```typescript
const channel = socket.getChannel("updates");

channel.subscribe((message) => {
    console.log("Update:", message.data);
});

// Pause with buffering
channel.pause({ bufferMessages: true });

// ... some messages arrive and are buffered ...

// Decide you don't need the buffered messages
channel.clearBufferedMessages();

// Resume without receiving old messages
channel.resume();
```

### Example 5: Event-Driven Pause Control

```typescript
import { ChannelEvents } from "qpub";

const channel = socket.getChannel("chat");

// Track pause state
channel.on(ChannelEvents.PAUSED, ({ channelName, buffering }) => {
    updateUI({
        status: "paused",
        buffering,
        message: "Chat messages paused",
    });
});

channel.on(
    ChannelEvents.RESUMED,
    ({ channelName, bufferedMessagesDelivered }) => {
        updateUI({
            status: "active",
            message: `Chat resumed. ${bufferedMessagesDelivered} messages caught up.`,
        });
    }
);

// UI controls
pauseButton.onclick = () => channel.pause();
resumeButton.onclick = () => channel.resume();
```

### Example 6: React Hook for Auto-Pause

```typescript
import { useChannel } from "qpub-react";
import { useEffect, useState } from "react";

function useChannelWithAutoPause(channelName: string, autoPauseDelay = 30000) {
    const channel = useChannel(channelName);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Track user activity
    useEffect(() => {
        const handleActivity = () => setLastActivity(Date.now());

        window.addEventListener("mousemove", handleActivity);
        window.addEventListener("keydown", handleActivity);

        return () => {
            window.removeEventListener("mousemove", handleActivity);
            window.removeEventListener("keydown", handleActivity);
        };
    }, []);

    // Auto-pause after inactivity
    useEffect(() => {
        const timer = setInterval(() => {
            const inactive = Date.now() - lastActivity > autoPauseDelay;

            if (inactive && !channel.isPaused()) {
                console.log("Auto-pausing due to inactivity");
                channel.pause();
            } else if (!inactive && channel.isPaused()) {
                console.log("Resuming due to activity");
                channel.resume();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [lastActivity, autoPauseDelay, channel]);

    return channel;
}

// Usage
function MyComponent() {
    const channel = useChannelWithAutoPause("notifications", 30000);

    // ... rest of component
}
```

## React-Specific Considerations

### Reactive State vs Function

The `useChannel` hook provides **both** a reactive state and a function for pause status:

```typescript
const { paused, isPaused } = useChannel("my-channel");

// ✅ Use reactive state for React hooks
useEffect(() => {
    // This triggers when pause state changes
    if (paused) {
        console.log("Channel is paused");
    }
}, [paused]);

// ✅ Use function for immediate checks
const handleClick = () => {
    if (isPaused()) {
        console.log("Currently paused");
    }
};

// ❌ Don't do this - won't work as expected
useEffect(() => {
    console.log(isPaused()); // Won't trigger on state change
}, [isPaused]); // Only triggers if function reference changes (never)
```

**Rule of thumb:**

- Use `paused` state in useEffect dependencies and JSX
- Use `isPaused()` function for imperative checks in callbacks

## Best Practices

### 1. Use Buffering for Important Messages

```typescript
// For critical messages that users shouldn't miss
channel.pause({ bufferMessages: true }); // default
```

### 2. Drop Messages for High-Volume Streams

```typescript
// For real-time data where only current values matter
const stockPriceChannel = socket.getChannel("stock-prices");
stockPriceChannel.pause({ bufferMessages: false });
```

### 3. Clear Buffers When Context Changes

```typescript
// When navigating away from a view
function handleNavigateAway() {
    channel.clearBufferedMessages(); // Don't deliver outdated messages
    channel.resume(); // Keep receiving new messages
}
```

### 4. Check Pause State Before Operations

Core SDK:

```typescript
if (channel.isPaused()) {
    console.warn("Channel is paused, resume before expecting new messages");
}
```

React:

```typescript
// In JSX or effects - use reactive state
if (paused) {
    console.warn("Channel is paused");
}

// In callbacks - either works
const handlePublish = () => {
    if (isPaused()) {
        // or: if (paused)
        alert("Cannot publish while paused");
    }
};
```

### 5. Clean Up on Unmount

```typescript
useEffect(() => {
    return () => {
        // Resume on unmount to prevent memory leaks from buffered messages
        if (paused) {
            clearBufferedMessages();
            resume();
        }
    };
}, [paused, clearBufferedMessages, resume]);
```

## Performance Considerations

### Memory Usage

Buffered messages are stored in memory. For high-volume channels:

```typescript
// Option 1: Disable buffering
channel.pause({ bufferMessages: false });

// Option 2: Periodically clear buffer
setInterval(() => {
    if (channel.isPaused()) {
        channel.clearBufferedMessages();
    }
}, 5000);
```

### Network Traffic

- Pausing does **NOT** reduce network traffic (messages still arrive via WebSocket)
- To save bandwidth, use `unsubscribe()` instead
- Pause is best for **temporary UI state** rather than bandwidth optimization

### When to Use Unsubscribe vs Pause

| Scenario                         | Use             |
| -------------------------------- | --------------- |
| Temporarily hiding notifications | `pause()`       |
| User navigating away permanently | `unsubscribe()` |
| Saving mobile data               | `unsubscribe()` |
| Background processing            | `pause()`       |
| User logs out                    | `unsubscribe()` |
| Modal dialog open                | `pause()`       |

## Comparison: Pause vs Unsubscribe

```typescript
// Pause: Quick toggle, buffers messages, keeps subscription
channel.pause();
// ... later
channel.resume(); // Instant, no server round-trip

// Unsubscribe: Removes subscription, requires resubscribe
channel.unsubscribe();
// ... later
channel.subscribe(callback); // Requires server round-trip
```

## TypeScript Types

```typescript
interface SocketChannel {
    pause(options?: { bufferMessages?: boolean }): void;
    resume(): void;
    isPaused(): boolean;
    clearBufferedMessages(): void;
}

interface ChannelEventPayloads {
    paused: {
        channelName: string;
        buffering: boolean;
    };
    resumed: {
        channelName: string;
        bufferedMessagesDelivered: number;
    };
}
```

## Troubleshooting

### Messages Not Being Delivered After Resume

```typescript
// Ensure you're checking the right state
if (!channel.isPaused() && channel.isSubscribed()) {
    console.log("Channel should receive messages");
}
```

### Buffer Growing Too Large

```typescript
// Monitor buffer size via event payload
channel.on(ChannelEvents.RESUMED, ({ bufferedMessagesDelivered }) => {
    if (bufferedMessagesDelivered > 1000) {
        console.warn("Large buffer was accumulated");
    }
});
```

### Pause Not Working

```typescript
// Ensure channel is subscribed first
if (!channel.isSubscribed()) {
    console.error("Cannot pause unsubscribed channel");
}

// Check current state
console.log("Paused:", channel.isPaused());
console.log("Subscribed:", channel.isSubscribed());
```

## Related Documentation

- [Connection Events Usage](./connection-events-usage.md)
- [Testing Best Practices](./testing-best-practices.md)
- [Architecture Overview](./architecture.md)

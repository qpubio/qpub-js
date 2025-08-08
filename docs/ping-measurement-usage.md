# WebSocket Ping Method Guide

This document explains how to use the simple `ping()` method in the QPub WebSocket SDK to measure connection latency on-demand.

## Overview

The SDK provides a simple `ping(): Promise<number>` method that sends a ping to the server and returns the round-trip time (RTT) in milliseconds. This is a clean, promise-based approach for measuring connection latency when you need it.

## Configuration Options

```typescript
{
  // Timeout for ping requests
  pingTimeoutMs: 10000, // default: 10000ms (10 seconds)
}
```

## Usage Examples

### Core SDK Usage

```typescript
import { QPub } from "@qpub/sdk";

const client = new QPub({
    pingTimeoutMs: 5000, // Optional: timeout for ping requests
});

await client.connect();

// Send a ping and get RTT
try {
    const rtt = await client.connection.ping();
    console.log(`RTT: ${rtt.toFixed(2)}ms`);
} catch (error) {
    console.error("Ping failed:", error);
}

// Multiple pings for average calculation
const rtts = [];
for (let i = 0; i < 5; i++) {
    try {
        const rtt = await client.connection.ping();
        rtts.push(rtt);
    } catch (error) {
        console.error(`Ping ${i + 1} failed:`, error);
    }
}

const averageRTT = rtts.reduce((sum, rtt) => sum + rtt, 0) / rtts.length;
console.log(`Average RTT: ${averageRTT.toFixed(2)}ms`);
```

### React Integration

```typescript
import React from 'react';
import { useConnection } from '@qpub/react';

function ConnectionMonitor() {
  const { status, ping } = useConnection();
  const [lastRTT, setLastRTT] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handlePing = async () => {
    setIsLoading(true);
    try {
      const rtt = await ping();
      setLastRTT(rtt);
    } catch (error) {
      console.error('Ping failed:', error);
      setLastRTT(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3>Connection Status: {status}</h3>
      <p>Last RTT: {lastRTT ? `${lastRTT.toFixed(2)}ms` : 'No measurement'}</p>

      {/* Connection Quality Indicator */}
      {lastRTT && (
        <p>Quality:
          <span style={{
            color: lastRTT < 50 ? 'green' :
                   lastRTT < 150 ? 'orange' : 'red'
          }}>
            {lastRTT < 50 ? 'Excellent' :
             lastRTT < 150 ? 'Good' : 'Poor'}
          </span>
        </p>
      )}

      <button onClick={handlePing} disabled={isLoading}>
        {isLoading ? 'Pinging...' : 'Ping Server'}
      </button>
    </div>
  );
}
```

### SocketProvider Configuration

```typescript
import { SocketProvider } from '@qpub/react';

function App() {
  return (
    <SocketProvider
      options={{
        pingTimeoutMs: 5000, // Optional timeout for ping requests
      }}
    >
      <YourApp />
    </SocketProvider>
  );
}
```

## Connection Quality Guidelines

RTT values can be interpreted as follows:

- **< 50ms**: Excellent connection
- **50-150ms**: Good connection
- **150-300ms**: Fair connection
- **> 300ms**: Poor connection

## API Reference

### Method

```typescript
// Send ping and get RTT
ping(): Promise<number>
```

**Returns**: Promise that resolves with RTT in milliseconds  
**Throws**: Error if connection is not open or ping times out

### Usage Examples

```typescript
// Basic ping
const rtt = await connection.ping();

// With error handling
try {
    const rtt = await connection.ping();
    console.log(`Connection latency: ${rtt.toFixed(2)}ms`);
} catch (error) {
    console.error("Ping failed:", error.message);
}

// Batch pings for statistics
const measurements = await Promise.allSettled([
    connection.ping(),
    connection.ping(),
    connection.ping(),
]);

const successful = measurements
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

if (successful.length > 0) {
    const avgRTT = successful.reduce((a, b) => a + b) / successful.length;
    console.log(`Average RTT: ${avgRTT.toFixed(2)}ms`);
}
```

## Best Practices

1. **On-demand measurement**: Only ping when you need latency information
2. **Error handling**: Always wrap ping calls in try/catch
3. **Connection checks**: Ensure connection is open before pinging
4. **Timeout configuration**: Set reasonable `pingTimeoutMs` for your use case

## Implementation Notes

- Uses `performance.now()` for high-precision timing
- Each ping gets a unique sequential ID for reliable response matching
- Ping timeout prevents hanging promises
- Automatic cleanup on connection close/reset
- Thread-safe with proper promise resolution/rejection

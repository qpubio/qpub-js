# Performance Considerations for Async Methods

## Overview

The `subscribe()`, `unsubscribe()`, and `resubscribe()` methods return Promises that can be used with or without `await`. However, there are performance implications to consider.

## Performance Characteristics

### Optimized Fast Paths (No Overhead)

These scenarios return immediately with minimal overhead:

```typescript
// Already subscribed - just updates callback
await channel.subscribe(newCallback);  // Fast: Promise.resolve()

// Adding event-specific callback to already-subscribed channel  
await channel.subscribe(callback, { event: "user-login" }); // Fast: Promise.resolve()

// Unsubscribing when not subscribed
await channel.unsubscribe(); // Fast: Promise.resolve()
```

**Cost:** Only the Promise.resolve() wrapper (~10 bytes)

### Network-Dependent Paths (Has Overhead)

When a network call is required, even fire-and-forget usage creates overhead:

```typescript
// First subscribe on new channel
channel.subscribe(callback); // NO await - but creates Promise + listeners + timeout!
```

**Cost per call until server responds:**
- 1 Promise object with resolve/reject handlers (~100 bytes)
- 2 event listeners (SUBSCRIBED + FAILED) (~200 bytes)  
- 1 timeout (10 seconds default) + tracking (~50 bytes)
- **Total: ~350 bytes**

**Cleanup occurs when:**
- Server responds (typically < 100ms)
- Timeout fires (10 seconds)
- Channel reset() is called

## Recommendations

### Best Practices

1. **Use `await` when you need confirmation:**
   ```typescript
   try {
       await channel.subscribe(callback);
       console.log("Confirmed subscribed!");
   } catch (error) {
       console.error("Subscription failed:", error);
   }
   ```

2. **Fire-and-forget is fine for typical usage:**
   ```typescript
   // This is perfectly fine in normal scenarios
   channel.subscribe(callback);
   ```

3. **Avoid rapid fire-and-forget in loops:**
   ```typescript
   // ❌ BAD: Creates overhead for each iteration
   for (const event of events) {
       channel.subscribe(callback, { event }); // No await!
   }
   
   // ✅ GOOD: Wait for each to complete
   for (const event of events) {
       await channel.subscribe(callback, { event });
   }
   
   // ✅ BETTER: Parallel if independent
   await Promise.all(
       events.map(event => 
           channel.subscribe(callback, { event })
       )
   );
   ```

4. **Set shorter timeouts for performance-critical code:**
   ```typescript
   await channel.subscribe(callback, { timeout: 2000 }); // 2s instead of 10s
   ```

5. **Clean up when done:**
   ```typescript
   useEffect(() => {
       const channel = socket.channels.get('my-channel');
       channel.subscribe(callback);
       
       return () => {
           channel.reset(); // Clears all pending timeouts
       };
   }, []);
   ```

### Performance Impact Summary

| Scenario | Fire-and-forget Overhead | With await Overhead | Notes |
|----------|-------------------------|---------------------|-------|
| Already subscribed | Minimal (~10 bytes) | Minimal | Fast path optimization |
| Adding event callback | Minimal (~10 bytes) | Minimal | Fast path optimization |
| New subscription | ~350 bytes until response | ~350 bytes until response | Cleaned up when server responds |
| Network delay (5s) | 350 bytes × 5s | 350 bytes × 5s | Same overhead, but await lets you handle errors |
| 100 rapid calls | 35 KB until responses | 35 KB until responses | Consider using await to serialize |

## Conclusion

The current implementation is **well-optimized for typical usage patterns**:
- Fast paths return immediately for common cases
- Overhead only exists when network calls are actually needed  
- Automatic cleanup prevents memory leaks
- The penalty for fire-and-forget is small and temporary

The event listeners and timeouts **will fire regardless of await** - this is by design to ensure proper cleanup and state management. The overhead is acceptable for normal usage, but be mindful in high-frequency or batch scenarios.


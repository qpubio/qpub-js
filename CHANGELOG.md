# Changelog

All notable changes to QPub JavaScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2025-10-28

### BREAKING CHANGES

- **Package Renamed**: Changed package name from `qpub` to `@qpub/sdk`. All imports must be updated to use `@qpub/sdk` instead of `qpub`.
- **Manual Subscription Management**: Removed automatic subscription behavior from React integration. Consumers must now explicitly call `subscribe()` and manage cleanup with `unsubscribe()` for better control and to prevent race conditions.
- **Naming Convention Changes**:
    - Standardized to snake_case: `subscriptionId` → `subscription_id` in SocketChannel and message interfaces
    - Authentication field renamed: `clientId` → `alias` across JWT, AuthManager, and messaging interfaces
    - Connection message structure now uses snake_case format for consistency with server API

### Added

#### Channel Features

- **Event-Specific Subscriptions**: SocketChannel now supports subscribing to specific events, allowing callbacks to be registered for targeted message types with improved routing.
- **Pause/Resume Functionality**: Added `pause()` and `resume()` methods to SocketChannel with configurable message buffering or dropping options. Includes `PAUSED` and `RESUMED` events.
- **Operation Queue**: Implemented queuing system for rapid subscribe/unsubscribe calls, ensuring operations are processed in order with proper server acknowledgment handling.
- **Async Subscriptions**: Subscribe and unsubscribe methods now return Promises with configurable timeout options for better async/await support.
- **Channel Reference Counting**: Introduced reference counting for efficient channel lifecycle management and automatic cleanup.

#### Connection & Monitoring

- **Ping Functionality**: Added ping measurement capability to Connection class for monitoring round-trip time and connection health.
- **Instance ID Exposure**: Added `getInstanceId()` method to Socket and Rest classes, exposed in React SocketContext for debugging and tracking.
- **Abort Controllers**: Implemented abort controller pattern in Socket, Connection, and AuthManager for better operation cancellation during resets.

#### React Integration

- **Enhanced Hooks**: Updated `useChannel` hook to expose `pause()`, `resume()`, and `isPaused()` methods, plus channel reference management.
- **Connection State Checking**: Added connection state verification on mount in useChannel for improved initial status handling.

#### Developer Experience

- **Comprehensive Testing Utilities**: Added Jest configuration, mock factories, and test containers for improved test coverage.
- **Enhanced Logging**: Implemented ILogger dependency injection across SocketChannel, RestChannel, AuthManager, and Connection classes with detailed operation tracing.
- **Logging Performance Documentation**: Added comprehensive documentation detailing logger performance characteristics and best practices.
- **Extensive Documentation**: Created guides for pause/resume, event subscriptions, ping measurement, instance ID usage, and testing best practices.

### Changed

#### Architecture

- **Dependency Injection**: Complete refactor implementing dependency injection pattern for core services, enhancing modularity and testability.
- **Service Container**: Restructured service container and dependency injection architecture into dedicated bootstrap module with circular dependency detection using topological sort.
- **Type Organization**: Reorganized type imports from interfaces to structured types directory with consolidated event-related types and refactored service interfaces.
- **Shared Utilities**: Moved all internal utility imports to centralized shared directory.

#### React Integration

- **Simplified SocketProvider**: Removed global instance management and streamlined socket creation and cleanup logic.
- **Enhanced Instance Management**: Improved socket instance management with better cleanup and instance key generation to prevent multiple instances.

#### Channel Management

- **Smart Resubscription**: Updated SocketChannelManager to only resubscribe channels with active callbacks, improving efficiency.
- **Message Handler Setup**: Enhanced SocketChannel to ensure message handlers are correctly set up and removed during resets.
- **Batch Message Support**: Updated SocketChannel to correctly handle message IDs for batch messages.

#### Message Handling

- **Reorganized Message Interfaces**: Consolidated connection and data message structures for better clarity and maintainability.
- **REST Batch Publishing**: Implemented batch publishing capability for REST channels.

### Fixed

- **Auto-resubscription Race Condition**: Resolved race condition in core SDK auto-resubscription logic caused by pendingSubscribe flag conflicts.
- **Callback Updates**: Fixed message callback handling for already subscribed channels to ensure correct message routing.
- **Reset Logic**: Improved reset order of operations in Socket, SocketChannel, and WebSocketClient to ensure proper cleanup.
- **Intentional Disconnect Handling**: Enhanced Connection class to properly distinguish intentional disconnects from errors, improving reconnection logic.
- **Safe Unsubscription**: Ensured safe unsubscription from socket channels with proper error handling.
- **Single Message Reception**: Fixed handling of single messages without ID suffix in batch message scenarios.
- **Initial Connection Status**: Set proper initial connection status in useConnection hook.

### Documentation

- Added comprehensive guides for:
    - Channel pause/resume usage
    - Event-specific subscriptions
    - Connection event handling
    - Ping measurement
    - Instance ID usage
    - Logging performance optimization
    - Testing best practices
    - Architecture and dependency injection patterns

## [1.0.1] - 2024-01-11

Initial release of the QPub JavaScript client library.

[v2.0.0]: https://github.com/qpubio/qpub-js/compare/v1.0.0...v2.0.0
[v1.0.1]: https://github.com/qpubio/qpub-js/releases/tag/v1.0.0

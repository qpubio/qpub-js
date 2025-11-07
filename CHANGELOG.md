# Changelog

All notable changes to QPub JavaScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.6] - 2025-11-07

### Added

- **Flexible JWT Authentication**: Enhanced JWT handling to support optional alias and permission fields, providing greater flexibility in token generation for various authentication scenarios.

### Fixed

- **JWT Validation**: Adjusted validation logic to correctly handle tokens without alias or permission fields, allowing broader authentication use cases.

### Documentation

- Updated README.md for improved clarity and formatting.

## [2.0.5] - 2025-11-07

### Added

- **Apache License 2.0**: Introduced LICENSE file containing the full text of Apache License 2.0, making the project officially open source.
- **Contributing Guidelines**: Added comprehensive CONTRIBUTING.md file with development setup, workflow, code standards, testing guidelines, and pull request process.

### Documentation

- Added License section in README.md to inform users about project licensing.
- Updated README.md to reference the new contributing guide.
- Enhanced ci-cd-workflow.md with quick reference for publishing and detailed step-by-step instructions for maintainers.

## [2.0.4] - 2025-11-07

### Changed

- **CI/CD Workflow**: Updated GitHub Actions workflow with write permissions for contents to enable automated GitHub release creation.
- **Release Process**: Replaced create-release action with `gh release create` command for improved flexibility and customization of release notes.

## [2.0.3] - 2025-11-07

### Added

- **CI/CD Workflows**: Added GitHub Actions workflows for continuous integration and deployment, including automated build and publish steps.

### Changed

- **Test Compatibility**: Enhanced performance.now mocking using Object.defineProperty for Node 18+ compatibility.
- **Coverage Thresholds**: Adjusted Jest coverage thresholds for better alignment with current testing capabilities.

### Fixed

- **API Key Handling**: Updated API key references from `privateKey` to `secretKey` across AuthManager and JWT classes for consistency with updated API key structure.

### Documentation

- Added CI/CD setup instructions in README.
- Introduced setup guide in .github directory for easier onboarding.

### Maintenance

- Updated .gitignore to exclude build artifacts and TypeScript build info files.
- Refactored import paths in testing utilities and related tests for better code organization.
- Improved test readability and maintainability in connection ping tests.

## [2.0.2] - 2025-11-04

### Added

- **Token Authentication Guide**: Comprehensive documentation detailing three methods for secure token generation: `generateToken()`, `issueToken()`, and the recommended `createTokenRequest()` + `requestToken()` pattern.
- **Rest Authentication**: Added auth manager to Rest interface for consistent authentication across Socket and Rest clients.

### Changed

- **Authentication Interface**: Updated references from `authManager` to `auth` for consistency across Socket and Rest classes.
- **Permission Structure**: Changed permissions property to singular `permission` in TokenOptions, TokenRequest, and JWTPayload interfaces for simplified permission handling.
- **useAuth Hook**: Enhanced to align with new auth structure.

### Fixed

- **Import Paths**: Updated import paths in README to reflect new package structure.

### Documentation

- Added comprehensive examples and security considerations in Token Authentication Guide.
- Detailed documentation for Permission interface to clarify usage.

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

[2.0.6]: https://github.com/qpubio/qpub-js/compare/v2.0.5...v2.0.6
[2.0.5]: https://github.com/qpubio/qpub-js/compare/v2.0.4...v2.0.5
[2.0.4]: https://github.com/qpubio/qpub-js/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/qpubio/qpub-js/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/qpubio/qpub-js/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/qpubio/qpub-js/compare/v1.0.1...v2.0.1
[1.0.1]: https://github.com/qpubio/qpub-js/releases/tag/v1.0.1

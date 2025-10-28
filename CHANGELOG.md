# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-03-XX

### Added

-   Complete rewrite of the library with TypeScript support
-   New modular architecture with separate Socket and REST clients
-   Advanced authentication system with JWT support
-   Automatic reconnection with exponential backoff
-   Event-based system for better state management
-   Cross-platform support (Browser and Node.js)
-   Singleton pattern for better resource management
-   Comprehensive WebSocket error handling
-   Ping/Pong mechanism for connection health monitoring
-   Channel subscription management
-   Token refresh mechanism
-   Custom HTTP client with Node.js fallback
-   UUID v7 generation for instance identification

### Changed

-   Split into ESM, CommonJS, and UMD bundles
-   Improved error handling and type safety
-   Enhanced connection lifecycle management
-   Better separation of concerns between components
-   More configurable options with sensible defaults

### Security

-   Added HMAC signing for token requests
-   Improved JWT handling and validation
-   Secure WebSocket connection management
-   API key parsing and validation

## [1.0.0] - Previous Version

Initial release of the QPub JavaScript client library.

[v2.0.0]: https://github.com/qpubio/qpub-backend/compare/v1.0.0...v2.0.0
[v1.0.0]: https://github.com/qpubio/qpub-backend/releases/tag/v1.0.0

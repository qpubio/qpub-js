# Token Authentication Guide

QPub provides three methods for token generation and authentication, each with different security levels and use cases. This guide covers all three methods with comprehensive examples.

## Overview

QPub supports three authentication approaches:

| Method | Security Level | Use Case | Where to Call |
|--------|---------------|----------|---------------|
| `generateToken()` | Medium-Low | Quick server-side token generation | Server-side only |
| `issueToken()` | Medium | Server-validated token generation | Server-side only |
| `createTokenRequest()` + `requestToken()` | High | Secure client-server token exchange | Server + Client |

## Method 1: generateToken (Server-Side Only)

### Description

Generate JWT tokens locally without server validation. This method signs tokens using your API key's private key directly in your application.

**Security Level:** Medium-Low

**Important:** Permission rules are not validated by the QPub server. Ensure you set correct permissions that align with your API key capabilities.

### Usage with Socket

```typescript
import { Socket } from '@qpub/sdk';

// Server-side only
const socket = new Socket({
    apiKey: 'your-api-key-with-private-key'
});

// Generate a token
const token = await socket.auth.generateToken({
    alias: 'user-123',
    permission: {
        'my-channel': ['subscribe', 'publish'],
        'another.*': ['subscribe']
    },
    expiresIn: 3600 // Token expires in 1 hour (default)
});

console.log('Generated token:', token);
```

### Usage with Rest

```typescript
import { Rest } from '@qpub/sdk';

// Server-side only
const rest = new Rest({
    apiKey: 'your-api-key-with-private-key'
});

// Generate a token
const token = await rest.auth.generateToken({
    alias: 'user-456',
    permission: {
        'private.*': ['subscribe']
    },
    expiresIn: 7200 // 2 hours
});

console.log('Generated token:', token);
```

### Parameters: TokenOptions

```typescript
interface TokenOptions {
    alias?: string;        // Client identifier (e.g., user ID)
    permission?: Permission;  // Resource permission map
    expiresIn?: number;    // Expiration time in seconds (default: 3600)
}

interface Permission {
    [resourcePattern: string]: string[];  // e.g., 'flights.*': ['publish'], '*': ['subscribe']
}
```

### Permission Patterns

QPub uses resource patterns and action arrays for fine-grained access control:

**Resource Patterns:**
- `"flights.*"` - All resources starting with "flights."
- `"users.123.*"` - All resources under "users.123."
- `"*"` - All resources (use with caution!)
- `"orders.pending"` - Exact resource match

**Common Actions:**
- `["subscribe"]` - Can receive messages
- `["publish"]` - Can send messages
- `["subscribe", "publish"]` - Can both send and receive
- `["*"]` - All actions (use with caution!)

**Examples:**

```typescript
// Specific channel access
permission: {
    "flights.departures": ["subscribe"],
    "flights.arrivals": ["subscribe", "publish"]
}

// Wildcard patterns
permission: {
    "users.123.*": ["subscribe", "publish"],  // All resources for user 123
    "public.*": ["subscribe"]                  // Read-only access to public resources
}

// Wildcard permissions (use carefully!)
permission: {
    "*": ["subscribe"]                         // Can subscribe to any resource
}

// Full access (avoid in production!)
permission: {
    "*": ["*"]                                 // All actions on all resources
}
```

### When to Use

- Rapid prototyping and development
- Simple applications with trusted server environment
- When you need quick token generation without network calls

### Security Considerations

- Your API key's private key must be kept secure
- Tokens are generated locally without server validation
- Permission rules are not checked against API key capabilities
- Only use on the server-side, never expose API keys to clients

## Method 2: issueToken (Server-Side Only)

### Description

Request the QPub server to issue and validate tokens. The server validates permissions against your API key capabilities before issuing the token.

**Security Level:** Medium

### Usage with Socket

```typescript
import { Socket } from '@qpub/sdk';

// Server-side only
const socket = new Socket({
    apiKey: 'your-api-key',
    httpHost: 'api.qpub.io',
    httpPort: 443,
    isSecure: true
});

// Issue a token from QPub server
const token = await socket.auth.issueToken({
    alias: 'user-789',
    permission: {
        'my-channel': ['subscribe', 'publish']
    },
    expiresIn: 3600
});

console.log('Issued token:', token);
```

### Usage with Rest

```typescript
import { Rest } from '@qpub/sdk';

// Server-side only
const rest = new Rest({
    apiKey: 'your-api-key',
    httpHost: 'api.qpub.io',
    httpPort: 443,
    isSecure: true
});

// Issue a token from QPub server
const token = await rest.auth.issueToken({
    alias: 'user-101',
    permission: {
        'public.*': ['subscribe'],
        'user-101.*': ['subscribe', 'publish']
    },
    expiresIn: 1800 // 30 minutes
});

console.log('Issued token:', token);
```

### API Endpoint

The SDK calls: `POST https://api.qpub.io/v1/key/{apiKeyId}/token/issue`

### When to Use

- When you need server-side permission validation
- Production applications with moderate security requirements
- When you want QPub to validate token permissions

### Security Considerations

- Server validates permissions against API key capabilities
- Requires network call to QPub server
- API key must still be kept secure on your server
- More secure than `generateToken()` but requires network latency

## Method 3: createTokenRequest + requestToken (Recommended)

### Description

The most secure two-step flow: your server creates a signed token request, the client uses it to request a token from QPub.

**Security Level:** High

This pattern follows the principle of least privilege - your server never holds the actual token, and clients can only get tokens with permissions your server explicitly grants.

### Complete Flow Diagram

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│   Client    │          │ Your Server │          │ QPub Server │
└──────┬──────┘          └──────┬──────┘          └──────┬──────┘
       │                        │                         │
       │  1. Request Auth       │                         │
       ├───────────────────────>│                         │
       │                        │                         │
       │                   2. createTokenRequest()        │
       │                        │                         │
       │  3. TokenRequest       │                         │
       │<───────────────────────┤                         │
       │                        │                         │
       │           4. requestToken(tokenRequest)          │
       ├──────────────────────────────────────────────────>│
       │                        │                         │
       │                        │                    5. Validate
       │                        │                      & Issue
       │                        │                         │
       │           6. Return Token                        │
       │<─────────────────────────────────────────────────┤
       │                        │                         │
```

### Step 1: Server Creates Token Request

```typescript
// your-server/auth-endpoint.ts
import { Rest } from '@qpub/sdk';

const rest = new Rest({
    apiKey: 'your-api-key-with-private-key'
});

// API endpoint to create token requests
app.post('/api/auth/token-request', async (req, res) => {
    const userId = req.user.id; // From your authentication
    
    try {
        // Create a signed token request
        const tokenRequest = await rest.auth.createTokenRequest({
            alias: `user-${userId}`,
            permission: {
                [`user-${userId}.*`]: ['subscribe', 'publish'],
                'public.*': ['subscribe']
            },
            expiresIn: 3600
        });
        
        // Send to client
        res.json({ tokenRequest });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Step 2: Client Requests Token

```typescript
// client-app.ts
import { Socket } from '@qpub/sdk';

// Initialize socket (no API key on client!)
const socket = new Socket({
    httpHost: 'api.qpub.io',
    httpPort: 443,
    isSecure: true,
    autoConnect: false
});

async function authenticateUser() {
    try {
        // 1. Get token request from your server
        const response = await fetch('/api/auth/token-request', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer your-session-token' }
        });
        
        const { tokenRequest } = await response.json();
        
        // 2. Use token request to get actual token from QPub
        const authResponse = await socket.auth.requestToken(tokenRequest);
        
        console.log('Authenticated with token:', authResponse.token);
        
        // 3. Now connect to QPub
        await socket.connection.connect();
        
    } catch (error) {
        console.error('Authentication failed:', error);
    }
}

authenticateUser();
```

### TokenRequest Interface

```typescript
interface TokenRequest {
    kid: string;           // API Key ID
    timestamp: number;     // Request timestamp (Unix timestamp)
    signature: string;     // HMAC signature
    alias?: string;        // Client identifier
    permission?: Permission;  // Resource permission map
}
```

### AuthResponse Interface

```typescript
interface AuthResponse {
    token?: string;        // JWT token
    tokenRequest?: TokenRequest;  // Or another token request
    [key: string]: any;    // Additional response data
}
```

### When to Use

- Production applications requiring high security
- Multi-tenant applications
- When API keys should never be exposed to clients
- Applications with fine-grained permission control

### Security Considerations

- API keys never leave your server
- QPub validates signatures and timestamps
- Tokens are scoped to specific users and permissions
- Most secure pattern recommended for production

## React Integration Example

Using the `useAuth` hook in React applications:

```typescript
import React, { useEffect, useState } from 'react';
import { SocketProvider, useAuth, useConnection } from '@qpub/sdk/react';

function App() {
    return (
        <SocketProvider options={{
            httpHost: 'api.qpub.io',
            httpPort: 443,
            isSecure: true,
            autoConnect: false
        }}>
            <AuthenticatedApp />
        </SocketProvider>
    );
}

function AuthenticatedApp() {
    const { requestToken, isAuthenticated, error } = useAuth();
    const { status, connect } = useConnection();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function authenticate() {
            if (isAuthenticated) return;
            
            setLoading(true);
            try {
                // Get token request from your server
                const response = await fetch('/api/auth/token-request', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer your-session-token' }
                });
                
                const { tokenRequest } = await response.json();
                
                // Request token from QPub
                await requestToken(tokenRequest);
                
                // Connect
                await connect();
            } catch (err) {
                console.error('Auth failed:', err);
            } finally {
                setLoading(false);
            }
        }
        
        authenticate();
    }, [isAuthenticated, requestToken, connect]);

    if (loading) return <div>Authenticating...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!isAuthenticated) return <div>Not authenticated</div>;
    
    return <div>Connected: {status}</div>;
}
```

## Node.js Express Server Example

Complete server-side example with all three methods:

```typescript
import express from 'express';
import { Rest } from '@qpub/sdk';

const app = express();
app.use(express.json());

const rest = new Rest({
    apiKey: process.env.QPUB_API_KEY,
    httpHost: 'api.qpub.io',
    httpPort: 443,
    isSecure: true
});

// Method 1: Generate Token (Quick but less secure)
app.post('/api/tokens/generate', async (req, res) => {
    try {
        const token = await rest.auth.generateToken({
            alias: req.body.userId,
            permission: req.body.permission,
            expiresIn: 3600
        });
        
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Method 2: Issue Token (Server-validated)
app.post('/api/tokens/issue', async (req, res) => {
    try {
        const token = await rest.auth.issueToken({
            alias: req.body.userId,
            permission: req.body.permission,
            expiresIn: 3600
        });
        
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Method 3: Create Token Request (Most secure)
app.post('/api/tokens/request', async (req, res) => {
    try {
        const tokenRequest = await rest.auth.createTokenRequest({
            alias: req.body.userId,
            permission: req.body.permission,
            expiresIn: 3600
        });
        
        res.json({ tokenRequest });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## Next.js API Route Example

Using Next.js API routes for secure token generation:

```typescript
// pages/api/auth/token-request.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Rest } from '@qpub/sdk';

const rest = new Rest({
    apiKey: process.env.QPUB_API_KEY,
    httpHost: 'api.qpub.io',
    httpPort: 443,
    isSecure: true
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user from session/JWT (your auth logic)
        const userId = req.headers['x-user-id'] as string;
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Create token request with appropriate permission
        const tokenRequest = await rest.auth.createTokenRequest({
            alias: `user-${userId}`,
            permission: {
                [`user-${userId}.*`]: ['subscribe', 'publish'],
                'public.*': ['subscribe']
            },
            expiresIn: 3600
        });

        res.status(200).json({ tokenRequest });
    } catch (error) {
        console.error('Token request failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
```

## Security Best Practices

### 1. API Key Management

```typescript
// ✅ Good: Use environment variables
const rest = new Rest({
    apiKey: process.env.QPUB_API_KEY
});

// ❌ Bad: Hard-coded API keys
const rest = new Rest({
    apiKey: 'sk_live_abcdef123456...'  // Never do this!
});
```

### 2. Token Expiration

```typescript
// ✅ Good: Short-lived tokens for clients
const tokenRequest = await rest.auth.createTokenRequest({
    alias: userId,
    expiresIn: 3600  // 1 hour
});

// ⚠️ Be careful: Long-lived tokens increase risk
const token = await rest.auth.generateToken({
    alias: userId,
    expiresIn: 86400 * 30  // 30 days - consider the security implications
});
```

### 3. Permission Scoping

```typescript
// ✅ Good: Minimal permission
const tokenRequest = await rest.auth.createTokenRequest({
    alias: `user-${userId}`,
    permission: {
        // User can only access their own resources
        [`user-${userId}.*`]: ['subscribe', 'publish'],
        // Read-only access to public resources
        'public.*': ['subscribe']
    }
});

// ❌ Bad: Overly broad permission
const tokenRequest = await rest.auth.createTokenRequest({
    alias: userId,
    permission: {
        '*': ['*']  // Too permissive - grants all permissions on all resources!
    }
});
```

### 4. Choose the Right Method

```typescript
// Development/Testing
const token = await rest.auth.generateToken({ ... });  // Quick and simple

// Production with server-side validation
const token = await rest.auth.issueToken({ ... });  // Validated by QPub

// Production with client-side usage (RECOMMENDED)
const tokenRequest = await rest.auth.createTokenRequest({ ... });
// Client calls: await socket.auth.requestToken(tokenRequest);
```

## Common Patterns

### Pattern 1: Token Refresh

```typescript
// Server endpoint for refreshing tokens
app.post('/api/auth/refresh', async (req, res) => {
    const { oldToken } = req.body;
    
    // Verify old token is still valid (your logic)
    const userId = verifyToken(oldToken);
    
    // Create new token request
    const tokenRequest = await rest.auth.createTokenRequest({
        alias: `user-${userId}`,
        permission: getUserPermissions(userId),
        expiresIn: 3600
    });
    
    res.json({ tokenRequest });
});
```

### Pattern 2: Multi-Tenant with Alias

```typescript
// Different users, same API key
const createUserToken = async (tenantId: string, userId: string) => {
    return await rest.auth.createTokenRequest({
        alias: `tenant-${tenantId}:user-${userId}`,
        permission: {
            [`tenant-${tenantId}.user-${userId}.*`]: ['subscribe', 'publish'],
            [`tenant-${tenantId}.public.*`]: ['subscribe']
        },
        expiresIn: 3600
    });
};
```

### Pattern 3: Error Handling

```typescript
async function authenticateWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch('/api/auth/token-request');
            const { tokenRequest } = await response.json();
            
            const authResponse = await socket.auth.requestToken(tokenRequest);
            return authResponse;
        } catch (error) {
            console.error(`Auth attempt ${i + 1} failed:`, error);
            
            if (i === maxRetries - 1) {
                throw new Error('Authentication failed after retries');
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

## TypeScript Type Definitions

```typescript
import { TokenOptions, TokenRequest, AuthResponse, Permission } from '@qpub/sdk';

// Use in your application
type UserPermission = {
    userId: string;
    permission: Permission;
};

async function createTokenForUser(user: UserPermission): Promise<TokenRequest> {
    return await rest.auth.createTokenRequest({
        alias: user.userId,
        permission: user.permission,
        expiresIn: 3600
    });
}

// Or use the Permission type directly
const userPermission: Permission = {
    'flights.*': ['subscribe'],
    'orders.*': ['subscribe', 'publish']
};
```

## Troubleshooting

### Issue: "API key is required"

```typescript
// Ensure API key is properly set
const rest = new Rest({
    apiKey: process.env.QPUB_API_KEY  // Check this is set
});

// Verify API key format (should include private key for generateToken/createTokenRequest)
console.log('API Key loaded:', !!process.env.QPUB_API_KEY);
```

### Issue: "Token generation failed"

```typescript
// Check if your API key includes the private key component
// API keys for generateToken/createTokenRequest need the full key with private part
// Example format: sk_live_keyId.privateKeyBase64
```

### Issue: "Invalid token response from QPub server"

```typescript
// Ensure correct host and port configuration
const rest = new Rest({
    apiKey: process.env.QPUB_API_KEY,
    httpHost: 'api.qpub.io',  // Correct host
    httpPort: 443,
    isSecure: true
});
```

## Additional Resources

- [QPub Dashboard](https://dashboard.qpub.io) - Manage API keys
- [Connection Events Usage](./connection-events-usage.md) - Handle auth events
- [Instance ID Usage](./instance-id-usage.md) - Track instances
- [Testing Best Practices](./testing-best-practices.md) - Test authentication flows

---

**Remember:** Always keep your API keys secure, use environment variables, and choose the authentication method that best fits your security requirements. For production applications, we recommend the `createTokenRequest` + `requestToken` pattern.


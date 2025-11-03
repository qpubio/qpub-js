# QPub JavaScript SDK

[QPub](https://qpub.io) is a pub/sub channels cloud and this is the official JavaScript client library including both real-time and REST interfaces.

To meet QPub and see more info and examples, please read the [documentation](https://qpub.io/docs).

# Getting Started

Follow these steps to just start building with QPub in JavaScript or see the [Quickstart guide](https://qpub.io/docs/getting-started/quickstart) which covers more programming languages.

## Install with package manager

Use any package manager like npm or yarn to install the JavaScript SDK.

Npm:

```bash
npm i @qpub/sdk
```

Yarn:

```bash
yarn add @qpub/sdk
```

Import as ES module:

```js
import { QPub, Message } from "@qpub/sdk";
```

Import from CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@qpub/sdk@latest/build/qpub.umd.js"></script>
```

## Interacting with QPub

Get your API key from [QPub dashboard](https://dashboard.qpub.io) by [creating a new project](https://dashboard.qpub.io/projects/create) or use existing one.

Connect to QPub:

```js
const socket = new QPub.Socket({ apiKey: "YOUR_API_KEY" });
```

Subscribe to a channel and listen for any data publishing to receive:

```js
let channel = socket.channels.get("my-channel");
channel.subscribe((message: Message) => {
    console.log({ message });
});
```

Publish a message:

```js
channel.publish("Hello!");
```

Publish a message with REST interface:

```js
const rest = new QPub.Rest({ apiKey: "YOUR_API_KEY" });

let channel = rest.channels.get("my-channel");

channel.publish("Hello!");
```

Publish batch messages:

```js
rest.channels
    .publishBatch(
        ["myChannel", "another-channel"],
        [
            { data: "Hello World 1", event: "fooEvent" },
            { data: "Hello World 2", event: "barEvent" },
            { data: "Hello World 3", event: "barEvent" },
        ]
    )
    .then((result) => {
        console.log(result);
    })
    .catch((err) => {
        console.error(`Error: ${err}`);
    });
```

## React Integration

QPub includes built-in React hooks and components for real-time socket connections.

Use manual subscription with proper cleanup for reliable message handling:

```jsx
import React, { useCallback, useEffect } from "react";
import { SocketProvider, useChannel, useConnection, Message } from "@qpub/sdk/react";

function App() {
    return (
        <SocketProvider options={{ apiKey: "YOUR_API_KEY" }}>
            <ChatRoom />
        </SocketProvider>
    );
}

function ChatRoom() {
    const { status } = useConnection();
    const { publish, subscribe, unsubscribe, ready } = useChannel("my-channel");

    const handleMessage = useCallback((message: Message) => {
        console.log("Received:", message);
    }, []);

    useEffect(() => {
        if (ready) {
            subscribe(handleMessage);

            return () => {
                unsubscribe();
            }
        }
    }, [channelStatus, subscribe, unsubscribe, handleMessage]);

    return (
        <div>
            <div>Connection: {status}</div>
            <div>Channel ready: {ready ? "✅" : "⏳"}</div>
            <button
                onClick={() => publish("Hello from Socket!")}
                disabled={!ready}
            >
                Send Message
            </button>
        </div>
    );
}
```

See [React Documentation](src/react-integration/README.md) for complete guide.

## Token Authentication

QPub provides three methods for secure token generation with different security levels. Learn more in the [Token Authentication Guide](docs/token-authentication.md):

- `generateToken()` - Quick server-side token generation
- `issueToken()` - Server-validated token generation  
- `createTokenRequest()` + `requestToken()` - Secure client-server token exchange (recommended)

# Development

Please, read the [contribution guide](https://qpub.io/docs/basics/contribution).

## Install

```bash
git clone git@github.com:qpubio/qpub-js.git
cd ./qpub-js/
npm i
```

Make your changes.

## Test

Write your tests, then run:

```bash
npm test
```


## Build

To build commonjs, esm, and umd bundles, run:

```bash
npm run build
```

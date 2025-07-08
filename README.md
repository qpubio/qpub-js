# QPub JavaScript SDK

[QPub](https://qpub.io) is a pub/sub channels cloud and this is the official JavaScript client library including both real-time and REST interfaces.

To meet QPub and see more info and examples, please read the [documentation](https://qpub.io/docs).

# Getting Started

Follow these steps to just start building with QPub in JavaScript or see the [Quickstart guide](https://qpub.io/docs/getting-started/quickstart) which covers more programming languages.

## Install with package manager

Use any package manager like npm or yarn to install the JavaScript SDK.

Npm:

```bash
npm i qpub
```

Yarn:

```bash
yarn add qpub
```

Import as ES module:

```js
import { QPub } from "qpub";
```

Import from CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/qpub@latest/build/qpub.umd.js"></script>
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
channel.subscribe((message: any) => {
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

# Development

Please, read the [contribution guide](https://qpub.io/docs/basics/contribution).

## Install

```bash
git clone git@github.com:qpubio/qpub-js.git
cd ./qpub-js/
npm i
```

Make your changes.

## Build

To build commonjs, esm, and umd bundles, run:

```bash
npm run build
```

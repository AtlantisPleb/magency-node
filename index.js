const WebSocket = require('ws');
const { IGEAgent } = require('./IGEAgent');
const { getPublicKey } = require('nostr-tools_1_1_1');
const NDK = require('@nostr-dev-kit/ndk').default
const { NDKPrivateKeySigner } = require('@nostr-dev-kit/ndk')
require('dotenv').config();

const relayUrl = "wss://magency.nostr1.com";
const wsClient = new WebSocket(relayUrl);

let sk = process.env['NOSTR_SK']
let pk = getPublicKey(sk); // `pk` is a hex string
const ndk = new NDK({
  explicitRelayUrls: [
    "wss://magency.nostr1.com",
  ],
  enableOutboxModel: true,
});

ndk.pool?.on("relay:connecting", (relay) => {
  console.log("🪄 MAIN POOL Connecting to relay", relay.url);
});

ndk.pool?.on("relay:connect", (relay) => {
  console.log("✅ MAIN POOL Connected to relay", relay.url);
});

ndk.signer = new NDKPrivateKeySigner(sk);
ndk.connect()


wsClient.on('open', () => {
    console.log("Connected to relay");

    // Example of sending a subscription request to listen for all text notes (kind 1)
    const subscriptionId = "sub1";
    wsClient.send(JSON.stringify(["REQ", subscriptionId, { kinds: [38000], limit: 1 }]));
});

wsClient.on('message', (data) => {
    const message = JSON.parse(data);

    if (message[0] === "EVENT") {
        // const subscriptionId = message[1];
        const event = message[2];
        console.log(`Received event kind ${event.kind} - ${event.id}`);

        // If this is a kind 38000, spawn an IGEAgent to parse the event
        if (event.kind === 38000) {
          new IGEAgent(event, wsClient, ndk);
        }
    } else if (message[0] === "OK") {
        console.log(`Event response: ${message[1]}, accepted: ${message[2]}, message: ${message[3]}`);
    } else if (message[0] === "EOSE") {
        const subscriptionId = message[1];
        console.log(`EOSE`);
    } else if (message[0] === "CLOSED") {
        const subscriptionId = message[1];
        const closeMessage = message[2];
        console.log(`Subscription ${subscriptionId} closed. Reason: ${closeMessage}`);
    } else if (message[0] === "NOTICE") {
        console.log(`Notice: ${message[1]}`);
    }
});

wsClient.on('error', (err) => {
    console.error("Error connecting to relay:", err);
});

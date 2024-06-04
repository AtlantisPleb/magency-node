const WebSocket = require('ws');

const relayUrl = "wss://magency.nostr1.com";
const wsClient = new WebSocket(relayUrl);

// import parseKind38000
const { parseKind38000 } = require('./router');

// Initialize IGEAgent
const horizon = 100;  // Example horizon
const model = 'gpt-4o';  // Replace with your actual model ID
const agent = new IGEAgent(horizon, model);  // Initialize IGEAgent

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
        if (event.kind === 38000) {
          parseKind38000(event, agent);
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

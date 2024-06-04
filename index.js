const WebSocket = require('ws');

const relayUrl = "wss://magency.nostr1.com";
const wsClient = new WebSocket(relayUrl);

wsClient.on('open', () => {
    console.log("Connected to relay");

    // Example of sending a subscription request to listen for all text notes (kind 1)
    const subscriptionId = "sub1";
    wsClient.send(JSON.stringify(["REQ", subscriptionId, { kinds: [38000] }]));
});

wsClient.on('message', (data) => {
    const message = JSON.parse(data);

    if (message[0] === "EVENT") {
        const subscriptionId = message[1];
        const event = message[2];
        console.log(`Received event for subscription ${subscriptionId}:`, event);
    } else if (message[0] === "OK") {
        console.log(`Event response: ${message[1]}, accepted: ${message[2]}, message: ${message[3]}`);
    } else if (message[0] === "EOSE") {
        const subscriptionId = message[1];
        console.log(`End of stored events for subscription ${subscriptionId}`);
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

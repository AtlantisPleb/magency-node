// Import the NDK package
const NDK = require('@nostr-dev-kit/ndk').default;

// Replace with your desired relay URL
const relayUrl = "wss://magency.nostr1.com";

// Create a new NDK instance with the specified relay
const ndk = new NDK({
    explicitRelayUrls: [relayUrl],
    // enableOutboxModel: true,
});

// Connect to the relay
async function connectAndListen() {
    try {
        await ndk.connect(5000);
        console.log("Connected maybe")
        console.log(ndk.pool)

        ndk.pool?.on("relay:connecting", (relay) => {
            console.log("🪄 MAIN POOL Connecting to relay", relay.url);
        });

        ndk.pool?.on("relay:connect", (relay) => {
            console.log("✅ MAIN POOL Connected to relay", relay.url);
        });
        // console.log(`Connected to relay: ${relayUrl}`);

        // Define the filter to listen for "kind: 1" events
        const filter = { kinds: [1] };

        // Subscribe to events with the specified filter
        ndk.subscribe(filter, {
            onEvent(event) {
                console.log("Received event:", event);
                console.log("Event content:", event.content);
            },
        });
    } catch (err) {
        console.error("Error connecting to relay:", err);
    }
}

// Start the connection and subscription
connectAndListen();

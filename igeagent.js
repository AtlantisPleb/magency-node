const { NostrEvent } = require("@nostr-dev-kit/ndk");

/**
 * A basic agent implementing Intelligent Go-Explore (IGE) in a web environment,
 *  using a shared archive & registry of actions via the Nostr protocol.
 */
class IGEAgent {
  constructor() {
    this.history = []; // Later rebuild this from local file or Nostr events
  }

  /**
   * Begin exploration process for a given prompt.
   * @param {NostrEvent} event - The event
   */
  parseEvent(event) {
    console.log("Parsing event kind " + event.kind + ", id: " + event.id);
    // If the event is kind 38000, parse a Magency prompt
    if (event.kind === 38000) {
      this.explore(event);
    } else {
      console.log("Unhandled event kind", event.kind);
    }
  }

  /**
   * Retrieve or create history for a given event.
   * @param {NostrEvent} event - The event
   * @returns {Object} The event history.
   */
  getHistory(event) {
    // Look up history by event.id
    let thisEventHistory;
    if (this.history.find((element) => element.id === event.id)) {
      // If so, return the response from this.history[]
      thisEventHistory = this.history.find((element) => element.id === event.id);
    } else {
      // If not, create a new entry in this.history[] with event.id
      thisEventHistory = { id: event.id, actions: [] };
      this.history.push(thisEventHistory);
    }
    return thisEventHistory;
  }

  /**
   * Begin exploration process for a given prompt.
   * @param {NostrEvent} event - The event
   * @returns {Object} The response data.
   */
  explore(event) {
    const thisEventHistory = this.getHistory(event);
    console.log("This event history:", thisEventHistory);
  }
}

module.exports = { IGEAgent };

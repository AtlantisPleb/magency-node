const { NostrEvent } = require("@nostr-dev-kit/ndk");

/**
 * A basic agent implementing Intelligent Go-Explore (IGE) in a web environment,
 *  using a shared archive & registry of actions via the Nostr protocol.
 */
class IGEAgent {
  /**
   * Begin exploration process for a given prompt.
   * @param {string} NostrEvent - The event
   */
  parseEvent(event) {
    console.log("Parsing event:", event);
  }

  /**
   * Begin exploration process for a given prompt.
   * @param {string} NostrEvent - The prompt from user.
   * @returns {Object} The response data.
   */
      // Look to see if the spell is in the archive; look up by event id?
    // For now assume it's new and add it to the archive
}

module.exports = { IGEAgent };

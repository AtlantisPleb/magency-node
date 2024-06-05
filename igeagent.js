const { NostrEvent } = require("@nostr-dev-kit/ndk");

/**
 * A basic agent implementing Intelligent Go-Explore (IGE) in a web environment
 *  and using shared archive & registry of actions via the Nostr protocol.
 */
class IGEAgent {
  /**
   * The agent spawns from a Magency Wish event.
   * @param {NostrEvent} event - The kind 38000 event
   * @returns {Object} The response data.
   */
  constructor(event) {
    this.event = event;
    this.goal = event.content;
    this.history = []; // Later rebuild this from local file or Nostr events
    this.actions = this.initializeActions(); // Hardcoded for now: later populate from NIP90
    console.log(`[IGEAgent-${event.id.slice(0, 8)}] ` + "Goal: " + this.goal);
    this.explore();
  }

  /**
   * Begin exploration process for a given event.
   * @param {NostrEvent} event - The event
   * @returns {Object} The response data.
   */
   explore() {
    // Get the history for this event
    const history = this.getHistory();
    // Given the history and available actions, decide what to do next
  }

  /**
   * Retrieve or create history for a given event.
   * @param {NostrEvent} event - The event
   * @returns {Object} The event history.
   */
  getHistory() {
    let event = this.event
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
   * Initialize the actions array.
   * @returns {Array} The array of actions.
   */
  initializeActions() {
    return [
      {
        name: "searchLatestArxivPapers",
        description: "Searches the latest arXiv papers for new insights based on a query and fetches up to a specified number of papers.",
        schema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query for arXiv papers." },
            maxResults: { type: "integer", description: "The maximum number of papers to fetch." },
          },
          required: ["query"]
        }
      },
      {
        name: "summarizePaper",
        description: "Summarizes the content of a given arXiv paper based on its ID.",
        schema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "The ID of the arXiv paper to summarize." },
          },
          required: ["paperId"]
        }
      },
      {
        name: "translatePaper",
        description: "Translates a given arXiv paper to a specified language.",
        schema: {
          type: "object",
          properties: {
            paperId: { type: "string", description: "The ID of the arXiv paper to translate." },
            targetLanguage: { type: "string", description: "The target language for translation." },
          },
          required: ["paperId", "targetLanguage"]
        }
      },
      {
        name: "generateInsights",
        description: "Generates summarized insights from a set of arXiv papers based on their IDs.",
        schema: {
          type: "object",
          properties: {
            paperIds: { type: "array", items: { type: "string" }, description: "An array of arXiv paper IDs to generate insights from." },
          },
          required: ["paperIds"]
        }
      }
    ];
  }
}

module.exports = { IGEAgent };

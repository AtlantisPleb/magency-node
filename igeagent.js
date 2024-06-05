const { NostrEvent } = require("@nostr-dev-kit/ndk");
const { getLLMResponse, openai } = require('./openai');

/**
 * @typedef {Object} Observation
 * @property {string[]} descriptions - Descriptions of the current observation.
 * @property {string} mission - The goal of the agent.
 * @property {number} direction - The direction the agent is facing.
 * @property {number} image - Image of the observation.
 */

/**
 * @typedef {Object} Infos
 * @property {number} step - The current step.
 * @property {string[]} descriptions - Descriptions of objects seen.
 */

/**
 * @typedef {Object} ArchiveState
 * @property {Observation} observation - The current observation.
 * @property {Infos} infos - The additional information.
 * @property {string[]} actsQueue - List of actions taken.
 * @property {number} stepCount - Number of steps taken.
 * @property {number} visits - Visitation counter.
 */

/**
 * @typedef {Object.<string, ArchiveState>} Archive
 */

/**
 * A basic agent implementing Intelligent Go-Explore (IGE) in a web environment
 * and using a shared history archive and registry of actions via the Nostr protocol.
 */
class IGEAgent {
  /**
   * The agent spawns from a Magency Wish event.
   * @param {NostrEvent} event - The kind 38000 event.
   */
  constructor(event) {
    this.event = event;
    this.goal = event.content;
    this.history = []; // Later rebuild this from local file or Nostr events.
    this.actions = this.initializeActions(); // Hardcoded for now: later populate from NIP90.
    this.archive = this.initializeArchive(); // Initialize the archive.
    this.stepCount = 0; // Initialize step count.
    console.log(`[IGEAgent-${event.id.slice(0, 8)}] Goal: ${this.goal}`);
    this.explore();
  }

  /**
   * Reset the internal state of the agent to a given state.
   * @param {ArchiveState} chosenState - The state to reset to.
   */
  resetState(chosenState) {
    this.history = []; // Clear history.
    this.actsQueue = [...chosenState.actsQueue]; // Reset actions queue.
    this.stepCount = chosenState.stepCount; // Set step count.
    console.log(`Restored to state with stepCount: ${this.stepCount}, actions queue length: ${this.actsQueue.length}`);
  }

  /**
   * Begin exploration process for a given event.
   */
  explore() {
    console.log(`Starting exploration from step count: ${this.stepCount}`);
    this.chooseNewState();
  }

  /**
   * Choose a new state based on the current state archive.
   */
  async chooseNewState() {
    const prompt = this.generatePrompt();
    console.log(`Generated prompt for LLM: ${prompt}`);
    const messages = [{ role: "system", content: "You are an agent. Respond in JSON." }, { role: "user", content: prompt }];
    const response = await getLLMResponse(messages, 'gpt-4-turbo');
    const choice = JSON.parse(response).choice;
    let state = Object.values(this.archive)[choice];
    console.log(`Chosen state index: ${choice}, with stepCount: ${state.stepCount}`);
    this.resetState(state);

    this.exploreNextStep();
  }

  /**
   * Continue exploration based on the new state.
   */
  exploreNextStep() {
    console.log(`Continuing exploration from step count: ${this.stepCount}`);
    if (this.stepCount < 10) {
      this.chooseNewState();
    } else {
      console.log('Exploration complete.');
    }
  }

  /**
   * Generate a prompt based on the goal and current state archive.
   * @returns {string} The prompt string.
   */
  generatePrompt() {
    let prompt = `Goal of the agent: ${this.goal}.\nCurrent state archive:\n`;
    Object.entries(this.archive).forEach(([stateId, stateInfo], i) => {
      const description = stateInfo.infos.descriptions.join(', ');
      prompt += `${i}. Timestep ${stateInfo.stepCount}: ${description}.\n`;
    });
    prompt += `Select a state index between 0 and ${Object.keys(this.archive).length - 1}:\n`;
    prompt += `Reply concisely and exactly with the following JSON format:\n{"choice": X}\nwhere X is the index of the desired choice.`;
    return prompt;
  }

  /**
   * Initialize the archive with some dummy data.
   * @returns {Archive} The initialized archive.
   */
  initializeArchive() {
    return {
      "state1": {
        observation: {
          descriptions: ["Initial state", "Nothing much around"],
          mission: this.goal,
          direction: 0,
          image: null
        },
        infos: {
          step: 1,
          descriptions: ["The agent is in an empty room"]
        },
        actsQueue: ["start"],
        stepCount: 1,
        visits: 1
      },
      "state2": {
        observation: {
          descriptions: ["Second state", "Found an interesting paper"],
          mission: this.goal,
          direction: 1,
          image: null
        },
        infos: {
          step: 2,
          descriptions: ["The agent is reading a new paper"]
        },
        actsQueue: ["start", "move to paper"],
        stepCount: 2,
        visits: 1
      },
      "state3": {
        observation: {
          descriptions: ["Third state", "Analyzing the paper"],
          mission: this.goal,
          direction: 2,
          image: null
        },
        infos: {
          step: 3,
          descriptions: ["The agent is analyzing the paper"]
        },
        actsQueue: ["start", "move to paper", "analyze"],
        stepCount: 3,
        visits: 1
      }
    };
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
            maxResults: { type: "integer", description: "The maximum number of papers to fetch." }
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
            paperId: { type: "string", description: "The ID of the arXiv paper to summarize." }
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
            targetLanguage: { type: "string", description: "The target language for translation." }
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
            paperIds: { type: "array", items: { type: "string" }, description: "An array of arXiv paper IDs to generate insights from." }
          },
          required: ["paperIds"]
        }
      }
    ];
  }
}

module.exports = { IGEAgent };

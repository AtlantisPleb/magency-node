/**
  * Here's an overview of the Intelligent Go-Explore (IGE) algorithm's implementation:
  * 1. User Prompt: The user provides a prompt or instruction for the agent, such as "What can you learn from the newest papers on arxiv.org?"* System Prompt: The system generates a prompt for the foundation model, providing context about the environment and the IGE strategy. This prompt is dynamic and adapted to different environments.
  * 2. State Selection Prompt: The foundation model is queried to select the most promising state from the archive. The prompt includes a list of discovered states and asks the model to choose a numerical index representing the selected state.
  * 3. Action Selection Prompt: Based on the selected state, the foundation model is prompted to choose the next action to explore from that state. The prompt includes the current state and the history of previously tried actions.
  * 4. Archive Filtering Prompt: After taking the selected action, the foundation model is queried again to judge whether the new state is interesting and should be added to the archive. The prompt includes the current archive and the new state.
  * 5. Repeat: The above steps are repeated for a specified number of iterations or until a desired outcome is achieved.
  * 6. Visualization: The results of the exploration are presented to the user in a user-friendly format, such as a summary of key findings.
  */

const ENV_DESCRIPTION = `You are an agent in a sandboxed web environment.
 You have access to tools and can interact with the environment.
 `;

const REACT_IGE_SYSTEM_MESSAGE = ENV_DESCRIPTION + `
 You will be prompted to perform systematic exploration in the style of Go-Explore.
 An archive will be maintained of interesting states found.
 You will be prompted to first reason about your plan and then:
 - Select a state from the archive that is the most promising, i.e., likely to lead to a solution or more novel states.
 - Explore from states intelligently, by picking new actions.
 - For each new state, you will be asked to decide if the state is interestingly new and should be added to the archive.
 You have #HORIZON# steps to complete the task.
 `;


const { getLLMResponse } = require('./openai')
const { randomInt } = require('crypto');
const axios = require('axios'); // For making API calls, such as calling the LLM service

/**
 * @typedef {Object} ArchiveEntry
 * @property {Object} observation - The observation data from the environment.
 * @property {Object} infos - The information about the observation.
 * @property {number} timestamp - The time step at which the observation and action occurred.
 */

/**
 * @typedef {Object} State
 * @property {string} goal - The current goal of the agent.
 * @property {number} currentStep - The current time step of the agent.
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {Object} observation - The observation data from the environment.
 * @property {Object} action - The action performed based on the observation.
 * @property {number} timestamp - The time step at which the observation and action occurred.
 */

class IGEAgent {
  /**
   * Create an instance of IGEAgent.
   * @param {number} horizon - The planning horizon for the agent.
   * @param {string} model - The LLM model identifier.
   * @param {boolean} [filterActions=true] - Whether to filter actions.
   */
  constructor(horizon, model, filterActions = true) {
    this.horizon = horizon;
    this.model = model;
    this.filterActions = filterActions;
    this.systemMessage = REACT_IGE_SYSTEM_MESSAGE.replace('#HORIZON#', horizon.toString()); // Formatted message for LLM
    this.banList = [];

    this.archive = []; // Stores observation-action pairs
    this.currentState = { goal: '', currentStep: 0 }; // Current state information
    this.history = []; // Interaction history
    this.llmMsgHistory = []; // For storing LLM messages
    this.totalCost = 0;

    // Hardcoded Archive Entries
    this.archive = [
      { infos: { descriptions: ["You have accessed the arXiv homepage.", "You see a search bar and several categories."] } },
      { infos: { descriptions: ["You have entered a search term 'machine learning'.", "You see a list of recent papers."] } },
      { infos: { descriptions: ["You have selected the first paper.", "You see the abstract and a download link."] } },
      { infos: { descriptions: ["You have filtered by recent date.", "You see a list of the newest papers in machine learning."] } },
      { infos: { descriptions: ["You have accessed the tools menu.", "You see options for citation, export, and related papers."] } },
      { infos: { descriptions: ["You are reading the abstract.", "You see insights into recent advancements in generative models."] } },
      { infos: { descriptions: ["You have downloaded the paper.", "You can access it in your local environment."] } },
      { infos: { descriptions: ["You are browsing categories.", "You see a category for natural language processing."] } },
      { infos: { descriptions: ["You have selected 'export list'.", "You can choose different formats - BibTeX or JSON."] } },
      { infos: { descriptions: ["You are using the citation tool.", "You see the citation in multiple formats."] } }
    ];
  }

  /**
   * Get filtered states from the archive according to the agent's criteria.
   * @returns {ArchiveEntry[]} The filtered states.
   */
  getFilteredStates() {
    // Implement your filtering logic here
    return this.archive;
  }

  /**
   * Send a prompt to the LLM and retrieve the index from its response.
   * @param {string} prompt - The prompt to send.
   * @param {string} model - The LLM model identifier.
   * @param {string} systemMessage - System message for the LLM.
   * @param {HistoryEntry[]} msgHistory - History of messages exchanged with the LLM.
   * @returns {Object} The response data containing the index.
   */
  async getIndexFromLLM(prompt, model, systemMessage, msgHistory) {
    try {
      // Construct the messages to be sent to the LLM
      const messages = [{ role: "system", content: systemMessage }, ...msgHistory, { role: "user", content: prompt }];

      // Get the response from the LLM using the helper function
      const response = await getLLMResponse(model, messages);
      console.log("LLM RESPONSE:\n", response)

      // Assuming that the response contains the index in the desired format

      console.log("------")
      console.log(response.choices[0].message)
      console.log("------")

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error:', error.message);
      throw new Error("Failed to get a response from the LLM");
    }
  }

  async chooseNewState() {
    const choices = this.getFilteredStates();

    let prompt = `Goal of the agent: ${this.currentState.goal}.\nCurrent state archive:\n`;
    choices.forEach((choice, i) => {
      // Check if descriptions exist before using them
      const descriptions = choice.infos && choice.infos.descriptions ? choice.infos.descriptions.join(", ") : "No descriptions";
      prompt += `${i}. Timestep ${choice.timestamp || 'Unknown'}: ${descriptions}.\n`;
    });
    prompt += `Select a state index between 0 and ${choices.length - 1}:\n`;

    console.log("Trying with prompt:\n", prompt);

    try {
      const { idx, cost, llmMsgHistory } = await this.getIndexFromLLM(prompt, this.model, this.systemMessage, this.llmMsgHistory);

      this.totalCost += cost;
      this.llmMsgHistory = llmMsgHistory;

      if (idx < 0 || idx >= choices.length) {
        throw new Error("Invalid state index.");
      }

      return choices[idx];
    } catch (error) {
      this.llmMsgHistory = this.llmMsgHistory.slice(0, -2);
      console.error(`Error: ${error.message}`);
      return choices[randomInt(choices.length)];
    }
  }

  /**
   * Choose a new state based on the current observation archive.
   * @returns {Object} The selected state entry.
   */
  // async chooseNewState() {
  //   const choices = this.getFilteredStates();

  //   let prompt = `Goal of the agent: ${this.currentState.goal}.\nCurrent state archive:\n`;
  //   choices.forEach((choice, i) => {
  //     prompt += `${i}. Timestep ${choice.timestamp}: ${choice.infos.descriptions.join(", ")}.\n`
  //   });
  //   prompt += `Select a state index between 0 and ${choices.length - 1}:\n`;

  //   console.log("Trying with prompt:", prompt);

  //   try {
  //     const { idx, cost, llmMsgHistory } = await this.getIndexFromLLM(prompt, this.model, this.systemMessage, this.llmMsgHistory);

  //     this.totalCost += cost;
  //     this.llmMsgHistory = llmMsgHistory;

  //     if (idx < 0 || idx >= choices.length) {
  //       throw new Error("Invalid state index.");
  //     }

  //     return choices[idx];
  //   } catch (error) {
  //     this.llmMsgHistory = this.llmMsgHistory.slice(0, -2);
  //     console.error(`Error: ${error.message}`);
  //     return choices[randomInt(choices.length)];
  //   }
  // }

  /**
   * Determine if the provided information should be added to the archive.
   * @param {Object} infos - The information about the observation.
   * @returns {boolean} Whether the information was added to the archive.
   */
  async addToArchive(infos) {
    if (this.banList.includes(infos.descriptions)) {
      return false;
    }

    const choices = this.getFilteredStates();
    let prompt = `Goal of the agent: ${this.goal}.\nCurrent archive:\n`;
    choices.forEach(choice => {
      prompt += `Timestep ${choice.timestamp}: ${choice.infos.descriptions.join(", ")}.\n`;
    });
    prompt += `\nNew state:\nTimestep ${this.history.length}: ${infos.descriptions.join(", ")}.\n`;
    prompt += 'A state is interestingly new if it is relevant to the task or could lead to further stepping stones, and not close to the existing states.\nIs this state interestingly new and should be added to the archive?\nChoices:\n0. Don\'t Add\n1. Add\n';

    try {
      const { idx, cost, llmMsgHistory } = await this.getIndexFromLLM(prompt, this.model, this.systemMessage, this.llmMsgHistory);

      this.totalCost += cost;
      this.llmMsgHistory = llmMsgHistory;

      if (idx < 0 || idx >= 2) {
        throw new Error("Invalid archive choice.");
      }

      if (idx === 1) {
        return true;
      } else {
        this.banList.push(infos.descriptions);
        return false;
      }
    } catch (error) {
      this.llmMsgHistory = this.llmMsgHistory.slice(0, -2);
      console.error(`Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Reset the current state and clear the history.
   */
  resetState() {
    this.currentState = { goal: '', currentStep: 0 };
    this.history = [];
  }

  /**
   * Decide on an action based on the current observation and the remaining actions.
   * @param {Object} observation - The current observation.
   * @param {Object[]} remainingActions - The set of remaining possible actions.
   * @returns {Object} The chosen action.
   */
  async act(observation, remainingActions) {
    const prompt = this.generatePrompt(this.currentState.goal, this.history, remainingActions, this.history.length);
    const action = await this.callLLMWithBackoff(prompt, this.model, this.history);
    this.history.push({ observation, action, timestamp: this.history.length });
    return action;
  }

  /**
   * Generate a prompt for the LLM based on the current goal, observations, actions, and time step.
   * @param {string} goal - The goal of the agent.
   * @param {HistoryEntry[]} observations - The history of observations.
   * @param {Object[]} actions - The history of actions.
   * @param {number} timestep - The current time step.
   * @returns {string} The generated prompt string.
   */
  generatePrompt(goal, observations, actions, timestep) {
    let prompt = `Goal of the agent: ${goal}.\nObservations:\n`;
    observations.forEach((obs, i) => {
      prompt += `${i}. Observation: ${JSON.stringify(obs)}\n`;
    });
    prompt += `Current timestep: ${timestep}\nPossible actions:\n${actions.map((a, i) => `${i}. ${a}`).join('\n')}\n`;
    prompt += 'Choose the most appropriate action:\n';
    return prompt;
  }

  /**
   * Call the LLM with a backoff mechanism in case of failure.
   * @param {string} prompt - The prompt to send to the LLM.
   * @param {string} model - The LLM model identifier.
   * @param {HistoryEntry[]} history - The history of interactions with the LLM.
   * @returns {Object} The response from the LLM.
   * @throws {Error} If the LLM fails to respond after multiple attempts.
   */
  async callLLMWithBackoff(prompt, model, history) {
    let response = null;
    const maxAttempts = 5;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      try {
        response = await axios.post('Your_LLM_API_Endpoint', {
          prompt,
          model,
          history
        });
        break;
      } catch (error) {
        console.warn(`LLM call failed, attempt ${attempts + 1}: ${error.message}`);
        // Implement a delay or exponential backoff here
      }
    }
    if (response === null) {
      throw new Error("Failed to get a response from the LLM after multiple attempts");
    }
    return response.data;
  }
}

// Pseudocode for LLM API call (to be implemented)
async function someLLMApiCall(prompt, model, history) {
  // Implement the actual API call to the LLM service
}

module.exports = { IGEAgent };

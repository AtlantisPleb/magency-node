const { getEventHash, signEvent, getPublicKey } = require('nostr-tools_1_1_1');
const { NDKEvent } = require('@nostr-dev-kit/ndk');
const { initializeActions, initializeArchive } = require('./dummydata');
const { getLLMResponse } = require('./openai');

require('dotenv').config();
let sk = process.env['NOSTR_SK']
let pk = getPublicKey(sk);

class IGEAgent {
  constructor(event, wsClient, ndk) {
    // Store the WebSocket client for sending messages.
    this.wsClient = wsClient;

    // Store the NDK instance for sending events.
    this.ndk = ndk;

    // Store the initial event object, which contains information about the goal.
    this.event = event;

    // Extract and store the goal from the event content for use in decision-making.
    this.goal = event.content;

    // Initialize an empty array to track the agent's past actions and observations.
    this.history = [];

    // Prepare a list of possible actions that the agent can perform. Hardcoded for now.
    this.actions = initializeActions();

    // Set up an archive to store visited states and related information for future reference. Hardcoded for now.
    this.archive = initializeArchive();

    // Initialize the step counter to track the number of actions taken by the agent.
    this.stepCount = 0;

    // Initialize an empty queue to manage the sequence of actions to be performed.
    this.actsQueue = [];

    // Placeholder for the agent's current state; will later hold detailed information about the state.
    this.currentState = null;
    console.log(`[IGEAgent-${event.id.slice(0, 8)}] Goal: ${this.goal}`);
    this.explore();
  }

  async notifyArchiveEvent(state) {
    let event = {
      kind: 38001,
      pubkey: pk,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(state),
    }
    event.id = getEventHash(event)
    event.sig = signEvent(event, sk)
    this.wsClient.send(JSON.stringify(["EVENT", event]));
    console.log("PUBLISHED EVENT 38001:", event)
  }

  /**
   * Reset the current state of the agent to a chosen archived state.
   * This involves clearing the current history and actsQueue, updating stepCount, and setting the current state.
   * @param {ArchiveState} chosenState - The archived state to which the agent should revert.
   */
  resetState(chosenState) {
    // Clear the current history, as we are reverting to a previous state.
    this.history = [];

    // Set the actsQueue to the actions from the chosen archived state.
    this.actsQueue = [...chosenState.actsQueue];

    // Update the step counter to match the chosen archived state.
    this.stepCount = chosenState.stepCount;

    // Set the current state to the chosen archived state.
    this.currentState = chosenState;

    console.log(`Restored to state with stepCount: ${this.stepCount}, actions queue length: ${this.actsQueue.length}`);
    console.log("We are now at: ", chosenState.observation.descriptions);
  }


  /**
   * Start exploration from the current step count.
   */
  explore() {
    console.log(`Starting exploration from step count: ${this.stepCount}`);
    this.chooseNewState();
  }

  /**
   * Choose a new state for the agent to explore based on the response from the LLM.
   * This involves generating a prompt for the LLM and processing the response.
   */
  async chooseNewState() {
    try {
      console.log("Choosing a new state...");

      // Generate the prompt for the LLM.
      const prompt = this.generatePrompt();
      console.log(`Generated prompt for LLM: ${prompt}`);

      // Define the messages to send to the LLM.
      const messages = [
        { role: "system", content: "You are an agent. Respond in JSON." },
        { role: "user", content: prompt }
      ];

      // Get the response from the LLM.
      const parsedResponse = await getLLMResponse(messages);
      console.log(`Received response from LLM:`, parsedResponse);

      // Extract the chosen state index.
      const choice = parsedResponse.choice;

      // Validate the choice against the archive.
      if (this.archive[choice] === undefined) {
        throw new Error(`Invalid choice index: ${choice}. No corresponding state in the archive.`);
      }

      // Get the chosen state from the archive.
      const state = this.archive[choice];
      console.log(`Chosen state index: ${choice}, with stepCount: ${state.stepCount}`);

      // Reset the state to the chosen state and continue exploration.
      this.resetState(state);
      this.exploreNextStep();
    } catch (error) {
      console.error('Error in chooseNewState:', error);
    }
  }

  generateKey(state) {
    // Generate a unique key for the state, assuming state has some unique identifier
    return JSON.stringify(state);
  }

  /**
   * Continue exploring the next steps from the current state.
   */
  async exploreNextStep() {
    console.log(`Continuing exploration from step count: ${this.stepCount}`);

    if (this.stepCount < 10) {
      const actionIndex = await this.selectNextAction(this.currentState);
      console.log('Selected action index:', actionIndex);

      const actionResult = await this.executeAction(actionIndex);
      this.currentState = actionResult.newState;
      this.stepCount += 1;

      if (this.shouldAddToArchive(actionResult.infos)) {
        this.archive[this.generateKey(actionResult.newState)] = actionResult.newState;
        console.log('Added new state to archive:', this.currentState);
        await this.notifyArchiveEvent(actionResult.newState);
      }

      this.exploreNextStep();
    } else {
      console.log('Exploration complete.');
    }
  }

  /**
   * Determine if the new state should be added to the archive.
   * @param {Infos} infos - Information about the new state.
   * @returns {boolean} - Whether the new state should be added to the archive.
   */
  async shouldAddToArchive(infos) {
    const prompt = `Should the new state be added to the archive?\nNew state:\n${infos.description}\nChoices:\n0. Don't Add\n1. Add`;
    throw new Error('implement shouldaddtotarchive')
    const addIndex = await this.askGPT(prompt);
    return addIndex === 1;
  }

  /**
   * Ask GPT for a response based on a given prompt.
   * @param {string} prompt - The prompt to provide to GPT.
   * @returns {number} - The response from GPT.
   */
  async askGPT(prompt) {
    console.log("------\nGPT prompt:");
    console.log(prompt)
    console.log("------")

    // Define the messages to send to the LLM.
    const messages = [
      { role: "system", content: "You are an agent. Respond in JSON." },
      { role: "user", content: prompt }
    ];

    // Get the response from the LLM.
    const parsedResponse = await getLLMResponse(messages);
    console.log(`Received response from LLM:`, parsedResponse);

    // Parse the LLM's response and extract the chosen state index.
    // const parsedResponse = JSON.parse(response);
    // const choice = parsedResponse.choice;
    // const comment = parsedResponse.comment;

    // console.log("LLM CHOSE ", choice, "WITH COMMENT: ", comment);
    // throw new Error("now send it")

    return parsedResponse
  }

  /**
   * Select the next action to take based on the current state.
   * @param {ArchiveState} state - The current state.
   * @returns {number} - The index of the selected action.
   * @throws {Error} - If the state structure is invalid.
   */
  async selectNextAction(state) {
    console.log("Current state: ", state);
    if (!state || !state.observation || !state.observation.descriptions) {
      console.error("Invalid state structure found in state:", state);
      throw new Error('Invalid state structure');
    }

    let prompt = systemPrompt
    prompt += `Based on the current state, select the next action:\nSTATE: ${state.observation.descriptions.join(', ')}\nACTION OPTIONS:\n`;
    actionList.forEach((action, index) => {
      prompt += `${index}: ${action}\n`;
    });
    prompt += "Select an index between 0 and " + (actionList.length - 1);
    prompt += `Reply concisely and exactly with the following JSON format:\n{"choice": X, "comment": Y}\nwhere X is the index of the desired choice and Y is a one-sentence comment explaining your choice.`;

    const actionIndex = await this.askGPT(prompt);
    const { choice, comment } = actionIndex;
    console.log("GPT chose action index:", choice, "with comment:", comment);
    return choice;
  }

  /**
   * Execute a selected action and return the result. (Simulated example)
   * @param {number} action - The index of the action to execute.
   * @returns {Object} - The result of executing the action.
   */
   async executeAction(actionIndex) {
    console.log("Executing action index:", actionIndex);

    // Look up the action by index from the actionList
    const actionPrompt = actionList[actionIndex];
    console.log("Executing action:", actionPrompt);

    // Get LLM response for the action
    const prompt = `Give simulated answers for the following action:\n${actionPrompt}\nProvide the new state details in the JSON format: {"newState": {...}, "reward": X, "done": Y, "infos": Z}`;
    const parsedResponse = await this.askGPT(prompt);

    console.log("GOT:", parsedResponse)

    return {
      newState: parsedResponse.newState,
      reward: parsedResponse.reward,
      done: parsedResponse.done,
      infos: parsedResponse.infos
    };
  }


  /**
   * Generate a prompt for the LLM based on the current goal and state archive.
   * @returns {string} - The generated prompt.
   */
  generatePrompt() {
    let prompt = systemPrompt
    prompt += `Goal of the agent: ${this.goal}.\nCurrent state archive:\n`;
    Object.entries(this.archive).forEach(([stateId, stateInfo], i) => {
      const description = stateInfo.observation.descriptions.join(', ');
      prompt += `${i}. Timestep ${stateInfo.stepCount}: ${description}\n`;
    });
    prompt += `Select a state index between 0 and ${Object.keys(this.archive).length - 1}:\n`;
    prompt += `Reply concisely and exactly with the following JSON format:\n{"choice": X}\nwhere X is the index of the desired choice.`;
    return prompt;
  }
}

module.exports = { IGEAgent };

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
 * @property {Infos} infos - Additional information.
 * @property {string[]} actsQueue - List of actions taken.
 * @property {number} stepCount - Number of steps taken.
 * @property {number} visits - Visitation counter.
 */

/**
 * @typedef {Object.<string, ArchiveState>} Archive
 */

const actionList = [
  "summarize text",
  "read webpage HTML",
  "download a PDF by URL",
  "extract text from PDF as markdown",
  "extract text from media file",
  "vector-embed a file",
  "retrieve a file embeddings",
  "prompt user for input",
  "generate an image",
  "request additional functionality"
];

const systemPrompt = `You are an agent in a sandboxed web environment. You have access to tools and can interact with the environment.
You will be prompted to perform systematic exploration in the style of Go-Explore.
An archive will be maintained of interesting states found.
You will be prompted to first reason about your plan and then:
- Select a state from the archive that is the most promising, i.e., likely to lead to a solution or more novel states.
- Explore from states intelligently, by picking new actions.
- For each new state, you will be asked to decide if the state is interestingly new and should be added to the archive.
------
`;

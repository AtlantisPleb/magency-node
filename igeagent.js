const { getEventHash, signEvent, getPublicKey } = require('nostr-tools_1_1_1');
const { initializeActions, initializeArchive } = require('./dummydata');
const { getLLMResponse } = require('./openai');

require('dotenv').config();
let sk = process.env['NOSTR_SK'];
let pk = getPublicKey(sk);

class IGEAgent {
  constructor(event, wsClient, ndk) {
    this.wsClient = wsClient;
    this.ndk = ndk;
    this.event = event;
    this.goal = event.content;
    this.history = [];
    this.actions = initializeActions();
    this.archive = initializeArchive();
    this.stepCount = 0;
    this.actsQueue = [];
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
    };
    event.id = getEventHash(event);
    event.sig = signEvent(event, sk);
    this.wsClient.send(JSON.stringify(["EVENT", event]));
    console.log("PUBLISHED EVENT 38001:", event);
  }

  // New method to notify action taken
  async notifyActionTaken(action) {
    let event = {
      kind: 38002,
      pubkey: pk,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(action),
    };
    event.id = getEventHash(event);
    event.sig = signEvent(event, sk);
    this.wsClient.send(JSON.stringify(["EVENT", event]));
    console.log("PUBLISHED EVENT 38002:", event);
  }

  resetState(chosenState) {
    this.history = [];
    this.actsQueue = [...chosenState.actsQueue];
    this.stepCount = chosenState.stepCount;
    this.currentState = chosenState;
    console.log(`Restored to state with stepCount: ${this.stepCount}, actions queue length: ${this.actsQueue.length}`);
    console.log("We are now at: ", chosenState.observation.descriptions);
  }

  explore() {
    console.log(`Starting exploration from step count: ${this.stepCount}`);
    this.chooseNewState();
  }

  async chooseNewState() {
    try {
      console.log("Choosing a new state...");
      const prompt = this.generatePrompt();
      console.log(`Generated prompt for LLM: ${prompt}`);

      const messages = [
        { role: "system", content: "You are an agent. Respond in JSON." },
        { role: "user", content: prompt }
      ];

      const parsedResponse = await getLLMResponse(messages);
      console.log(`Received response from LLM:`, parsedResponse);

      const choice = parsedResponse.choice;
      if (this.archive[choice] === undefined) {
        throw new Error(`Invalid choice index: ${choice}. No corresponding state in the archive.`);
      }

      const state = this.archive[choice];
      console.log(`Chosen state index: ${choice}, with stepCount: ${state.stepCount}`);

      if (!state.observation || !state.infos) {
        throw new Error('Invalid archive state structure');
      }

      this.resetState(state);
      this.exploreNextStep();
    } catch (error) {
      console.error('Error in chooseNewState:', error);
    }
  }

  generateKey(state) {
    return JSON.stringify(state);
  }

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

  async shouldAddToArchive(infos) {
    const prompt = `Should the new state be added to the archive?\nNew state:\n${JSON.stringify(infos)}\nChoices:\n0. Don't Add\n1. Add`;
    const parsedResponse = await this.askGPT(prompt);
    console.log("shouldAddToArchive response:", parsedResponse);
    return parsedResponse.choice === 1;
  }

  async askGPT(prompt) {
    console.log("------\nGPT prompt:");
    console.log(prompt);
    console.log("------");

    const messages = [
      { role: "system", content: "You are an agent. Respond in JSON." },
      { role: "user", content: prompt }
    ];

    const parsedResponse = await getLLMResponse(messages);
    console.log(`Received response from LLM:`, parsedResponse);

    return parsedResponse;
  }

  async selectNextAction(state) {
    console.log("Current state: ", state);

    if (!state || !state.observation) {
      console.error("Invalid state structure found in state:", state);
      throw new Error('Invalid state structure');
    }

    let formattedState;
    try {
      formattedState = JSON.stringify(state.observation);
    } catch (error) {
      console.error("Error stringifying state observation:", error);
      throw new Error('Error processing state observation');
    }

    let prompt = systemPrompt;
    prompt += `Based on the current state, select the next action:\nSTATE: ${formattedState}\nACTION OPTIONS:\n`;
    actionList.forEach((action, index) => {
      prompt += `${index}: ${action}\n`;
    });
    prompt += "Select an index between 0 and " + (actionList.length - 1);
    prompt += `\nReply concisely and exactly with the following JSON format:\n{"choice": X, "comment": Y}\nwhere X is the index of the desired choice and Y is a one-sentence comment explaining your choice.`;

    const actionIndex = await this.askGPT(prompt);
    const { choice, comment } = actionIndex;
    console.log("GPT chose action index:", choice, "with comment:", comment);
    return choice;
  }

  async executeAction(actionIndex) {
    console.log("Executing action index:", actionIndex);

    const actionPrompt = actionList[actionIndex];
    console.log("Executing action:", actionPrompt);

    const prompt = `Give simulated answers for the following action:\n${actionPrompt}\nProvide the new state details in the JSON format: {"observation": {...}, "reward": X, "done": Y, "infos": Z}`;
    const parsedResponse = await this.askGPT(prompt);

    console.log("GOT:", parsedResponse);

    // Extract the appropriate response based on possible structures
    const response = parsedResponse.simulation || parsedResponse.state || parsedResponse;

    if (!response.observation || (response.reward === undefined) || (response.done === undefined) || !response.infos) {
      throw new Error('Invalid action response structure');
    }

    const { observation, reward, done, infos } = response;

    // Notify about the action taken
    await this.notifyActionTaken({ action: actionPrompt, newState: response });

    // Construct and return the new state object
    return {
      newState: {
        observation,
        infos,
        actsQueue: this.currentState.actsQueue,
        stepCount: this.stepCount,
        visits: this.currentState.visits
      },
      reward,
      done,
      infos
    };
  }

  generatePrompt() {
    let prompt = systemPrompt;
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

const actionList = [
  "summarize text",
  "read webpage HTML",
  "download a PDF by URL",
  "extract text from PDF",
  "search the web",
  // "vector embed a file",
  // "retrieve a file embeddings",
  "prompt user for input",
  "generate an image",
  "request additional functionality"
];

const systemPrompt = `You are an agent in a sandboxed web environment. You have access to tools and can interact with the environment.
You will be prompted to perform systematic exploration in the style of Go-Explore.
An archive will be maintained of interesting states found.
You will be prompted to first reason about your plan and then:
Select a state from the archive that is the most promising, i.e., likely to lead to a solution or more novel states.
Explore from states intelligently, by picking new actions.
For each new state, you will be asked to decide if the state is interestingly new and should be added to the archive.
------
`;

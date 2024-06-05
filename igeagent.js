const { initializeActions, initializeArchive } = require('./dummydata');
const { getLLMResponse } = require('./openai');

class IGEAgent {
  constructor(event) {
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

  resetState(chosenState) {
    this.history = [];
    this.actsQueue = [...chosenState.actsQueue];
    this.stepCount = chosenState.stepCount;
    console.log(`Restored to state with stepCount: ${this.stepCount}, actions queue length: ${this.actsQueue.length}`);
    console.log("We are now at: ", chosenState.observation.descriptions);
  }

  explore() {
    console.log(`Starting exploration from step count: ${this.stepCount}`);
    this.chooseNewState();
  }

  async chooseNewState() {
    console.log("Choosing a new state...");
    const prompt = this.generatePrompt();
    console.log(`Generated prompt for LLM: ${prompt}`);
    const messages = [{ role: "system", content: "You are an agent. Respond in JSON." }, { role: "user", content: prompt }];
    const response = await getLLMResponse(messages, 'gpt-4-turbo');
    const choice = JSON.parse(response).choice;
    const state = Object.values(this.archive)[choice];
    console.log(`Chosen state index: ${choice}, with stepCount: ${state.stepCount}`);
    this.resetState(state);
    this.exploreNextStep();
  }

  async exploreNextStep() {
    console.log(`Continuing exploration from step count: ${this.stepCount}`);

    if (this.stepCount < 10) {
      const actionIndex = this.selectNextAction(this.currentState);
      console.log('Selected action index:', actionIndex);

      const actionResult = this.executeAction(actionIndex);
      this.currentState = actionResult.newState;
      this.stepCount += 1;

      if (this.shouldAddToArchive(actionResult.infos)) {
        this.archive[this.generateKey(actionResult.newState)] = actionResult.newState;
        console.log('Added new state to archive:', this.currentState);
      }

      this.exploreNextStep();
    } else {
      console.log('Exploration complete.');
    }
  }

  shouldAddToArchive(infos) {
    const prompt = `Should the new state be added to the archive?\nNew state:\n${infos.description}\nChoices:\n0. Don't Add\n1. Add`;
    const addIndex = this.askGPT(prompt);
    return addIndex === 1;
  }

  askGPT(prompt) {
    console.log('GPT prompt:', prompt);
    return Math.floor(Math.random() * 2);
  }

  selectNextAction(state) {
    console.log(state)
    if (!state || !state.observation || !state.observation.descriptions) {
      throw new Error('Invalid state structure');
    }

    let prompt = `Based on the current state, select the next action:\n${state.observation.descriptions.join(', ')}\nAction options:\n`;
    actionList.forEach((action, index) => {
      prompt += `${index}: ${action}\n`;
    });
    prompt += "Select an index between 0 and " + (actionList.length - 1);

    const actionIndex = this.askGPT(prompt);
    return actionIndex;
  }

  executeAction(action) {
    console.log("Executing action:", action);
    // Simulated example; you need to replace it with real implementation
    const result = env.step(action);
    return {
      newState: result.newState,
      reward: result.reward,
      done: result.done,
      infos: result.infos
    };
  }

  generatePrompt() {
    let prompt = `Goal of the agent: ${this.goal}.\nCurrent state archive:\n`;
    Object.entries(this.archive).forEach(([stateId, stateInfo], i) => {
      const description = stateInfo.observation.descriptions.join(', ');
      prompt += `${i}. Timestep ${stateInfo.stepCount}: ${description}.\n`;
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

const actionList = ["turn left", "turn right", "go forward", "pick up", "drop", "toggle"];
const env = {
  step(action) {
    // Example implementation for environment step function
    return {
      newState: {
        observation: { descriptions: ["Some new state"] },
        actionsRemaining: []
      },
      reward: 1,
      done: false,
      infos: { description: "Information about state" }
    };
  }
};

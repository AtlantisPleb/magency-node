// Export a function to handle event kind 38000
async function parseKind38000(data, agent) {
  const spell = data.content;

  // Example of using the IGEAgent instance
  // Update the agent's current state based on the new data
  agent.currentState.goal = spell;  // Adjust to represent your goal

  // Choose a new state (hypothetical use, adjust accordingly)
  try {
      const newState = await agent.chooseNewState();
      console.log("Chosen new state:", newState);
  } catch (error) {
      console.error("Error choosing a new state:", error);
  }
}

module.exports = {
  parseKind38000
};

// export a parseKind38000 function
function parseKind38000(data) {
  const spell = data.content
  const prompt = REACT_IGE_SYSTEM_MESSAGE + `Your goal is to fulfill this user intent: "${spell}". You will explore in that direction.`
  console.log("-----\n" + prompt + "\n-----")
}

module.exports = {
  parseKind38000
};

const ENV_DESCRIPTION = `You are an agent in a sandboxed web environment.
You have access to tools and can interact with the environment.
`;

const JSON_INSTRUCTION = `Reply concisely and exactly with the following JSON format:
{"choice": X}
where X is the index of the desired choice.`;

const REACT_IGE_SYSTEM_MESSAGE = ENV_DESCRIPTION + `
You will be prompted to perform systematic exploration in the style of Go-Explore.
An archive will be maintained of interesting states found.
You will be prompted to first reason about your plan and then:
- Select a state from the archive that is the most promising, i.e., likely to lead to a solution or more novel states.
- Explore from states intelligently, by picking new actions.
- For each new state, you will be asked to decide if the state is interestingly new and should be added to the archive.
`;

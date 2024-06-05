function initializeArchive() {
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

function initializeActions() {
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

module.exports = { initializeArchive, initializeActions };

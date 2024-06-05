// dummydata.js
function initializeArchive() {
  return {
    0: {
      observation: { descriptions: ["Initial state", "Nothing much around."] },
      infos: { step: 1, descriptions: ["Nothing much around."] },
      actsQueue: [],
      stepCount: 1,
      visits: 0
    },
    1: {
      observation: { descriptions: ["Second state", "Found an interesting paper."] },
      infos: { step: 2, descriptions: ["Found an interesting paper."] },
      actsQueue: [],
      stepCount: 2,
      visits: 0
    },
    2: {
      observation: { descriptions: ["Third state", "Analyzing the paper."] },
      infos: { step: 3, descriptions: ["Analyzing the paper."] },
      actsQueue: [],
      stepCount: 3,
      visits: 0
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

function initializeArchive() {
  return {
    0: {
      observation: { descriptions: ["Initial state", "Nothing much around."] },
      infos: { step: 1, descriptions: ["Nothing much around."] },
      actsQueue: [],
      stepCount: 1,
      visits: 0,
      metadata: {}
    },
    1: {
      observation: { descriptions: ["Second state", "Found an interesting document."] },
      infos: { step: 2, descriptions: ["Found an interesting document."] },
      actsQueue: [],
      stepCount: 2,
      visits: 0,
      metadata: { documentId: "doc123" }
    },
    2: {
      observation: { descriptions: ["Third state", "Processing the document."] },
      infos: { step: 3, descriptions: ["Processing the document."] },
      actsQueue: [],
      stepCount: 3,
      visits: 0,
      metadata: { documentId: "doc123" }
    }
  };
}

function initializeActions() {
  return [
    {
      name: "readWebpageHTML",
      description: "Reads the HTML content of a specified webpage.",
      schema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL of the webpage to read." }
        },
        required: ["url"]
      }
    },
    {
      name: "downloadPdfByUrl",
      description: "Downloads a PDF from a specified URL.",
      schema: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL of the PDF to download." }
        },
        required: ["url"]
      }
    },
    {
      name: "vectorEmbedFile",
      description: "Creates vector embeddings for the content of a specified file.",
      schema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "The file path of the document to embed." }
        },
        required: ["filePath"]
      }
    },
    {
      name: "retrieveFileEmbeddings",
      description: "Retrieves the vector embeddings of a specified file.",
      schema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "The file path of the document whose embeddings are to be retrieved." }
        },
        required: ["filePath"]
      }
    },
    {
      name: "promptUserForInput",
      description: "Prompts the user for additional input during a process.",
      schema: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message to display to the user." }
        },
        required: ["message"]
      }
    },
    {
      name: "requestAdditionalFunctionality",
      description: "Requests additional functionality that may not be currently supported.",
      schema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Detailed description of the requested functionality." }
        },
        required: ["description"]
      }
    }
  ];
}

module.exports = { initializeArchive, initializeActions };

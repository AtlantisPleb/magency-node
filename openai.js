const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // Ensure your API key is stored in the environment variable
});

async function getLLMResponse(model, messages) { // Added model as a parameter
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4-turbo", // model,  // Use the model parameter
      messages: messages,
      response_format: { "type": "json_object" },
    });
    console.log('Chat completion:', chatCompletion)
    return chatCompletion;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('APIError:', error.message);
    } else {
      console.error('UnexpectedError:', error);
    }
    throw new Error('Failed to get a response from the LLM');
  }
}

module.exports = { getLLMResponse };

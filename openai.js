const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // Ensure your API key is stored in the environment variable
});

async function getLLMResponse(messages, model = "gpt-4o") { // Added model as a parameter
  try {
    const chatCompletion = await openai.chat.completions.create({
      model,
      messages,
      response_format: { "type": "json_object" },
    });
    console.log('Chat completion:', chatCompletion.choices[0].message)
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

module.exports = { getLLMResponse, openai };

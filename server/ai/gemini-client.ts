import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateConversationalResponse(userMessage: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, using mock response');
    return `I understand you're working with our coaching system. ${userMessage.includes('sample') ? 'This platform provides comprehensive voice training across multiple dimensions including accent refinement, language enhancement, and executive communication skills.' : 'How can I assist you further with your communication goals?'}`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant having a natural conversation. Provide thoughtful, conversational responses that acknowledge the user's message and continue the dialogue naturally. Keep it concise but engaging."
        },
        { role: "user", content: userMessage }
      ],
    });

    return response.choices[0].message.content || "I'm here to help! Could you tell me more about what you're working on?";
  } catch (error) {
    console.error('Error generating conversational response:', error);

    return `I understand you're working with our coaching system. ${userMessage.includes('sample') ? 'This platform provides comprehensive voice training across multiple dimensions including accent refinement, language enhancement, and executive communication skills.' : 'How can I assist you further with your communication goals?'}`;
  }
}
import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateConversationalResponse(userMessage: string): Promise<string> {
  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Gemini API key not found, using mock response');
    return `I understand you're working with our coaching system. ${userMessage.includes('sample') ? 'This platform provides comprehensive voice training across multiple dimensions including accent refinement, language enhancement, and executive communication skills.' : 'How can I assist you further with your communication goals?'}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a helpful AI assistant having a natural conversation. The user said: "${userMessage}". Provide a thoughtful, conversational response that acknowledges their message and continues the dialogue naturally. Keep it concise but engaging.`
            }
          ]
        }
      ],
    });

    return response.text || "I'm here to help! Could you tell me more about what you're working on?";
  } catch (error) {
    console.error('Error generating conversational response:', error);
    
    // Fallback response
    return `I understand you're working with our coaching system. ${userMessage.includes('sample') ? 'This platform provides comprehensive voice training across multiple dimensions including accent refinement, language enhancement, and executive communication skills.' : 'How can I assist you further with your communication goals?'}`;
  }
}
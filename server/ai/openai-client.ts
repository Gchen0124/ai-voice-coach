import OpenAI from "openai";

// IMPORTANT: the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CoachingResponse {
  accent: string;
  language: string;
  executive: string;
}

export async function generateCoachingResponses(userMessage: string): Promise<CoachingResponse> {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, using mock responses');
    return {
      accent: userMessage.replace(/\b(um|uh|like)\b/gi, '').trim() || userMessage,
      language: userMessage.replace('This is', 'This exemplifies').replace('demonstrates', 'showcases'),
      executive: userMessage.replace('This is a sample', 'This represents a professional communication')
    };
  }

  try {
    const responses = await Promise.all([
      // Accent Coach - grammar corrections with same meaning
      openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an accent coach. Take the user's message and correct only minor grammar mistakes while keeping the exact same meaning and natural flow. If there are no grammar issues, return the message unchanged. Keep the same tone and style. Always respond with JSON format: {\"message\": \"your corrected version\"}"
          },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      }),

      // Language Coach - better phrasing
      openai.chat.completions.create({
        model: "gpt-5", 
        messages: [
          {
            role: "system",
            content: "You are a language coach. Transform the user's message into a more authentic, natural, professional, and concise expression while maintaining the exact same meaning. Make it sound more native and polished. Always respond with JSON format: {\"message\": \"improved version\"}"
          },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      }),

      // Executive Coach - professional communication
      openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system", 
            content: "You are a CEO/founder/executive communication coach. Transform the user's message into how a professional executive would express the same idea. Make it more authoritative, clear, and business-appropriate while preserving the core meaning. Always respond with JSON format: {\"message\": \"executive version\"}"
          },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" }
      })
    ]);

    const parseResponse = (response: any, fallback: string) => {
      try {
        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        return parsed.message || fallback;
      } catch {
        return response.choices[0].message.content || fallback;
      }
    };

    return {
      accent: parseResponse(responses[0], userMessage),
      language: parseResponse(responses[1], userMessage),
      executive: parseResponse(responses[2], userMessage)
    };
  } catch (error) {
    console.error('Error generating coaching responses:', error);
    
    // Fallback to mock responses
    return {
      accent: userMessage.replace(/\b(um|uh|like)\b/gi, '').trim() || userMessage,
      language: userMessage.replace('This is', 'This exemplifies').replace('demonstrates', 'showcases'),
      executive: userMessage.replace('This is a sample', 'This represents a professional communication')
    };
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, skipping transcription');
    throw new Error('OpenAI API key not available');
  }

  try {
    // Create a proper form data entry for OpenAI
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    
    const transcription = await openai.audio.transcriptions.create({
      file: blob as any, // OpenAI client accepts Blob
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
}
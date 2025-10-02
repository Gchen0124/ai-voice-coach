import OpenAI from "openai";
import { createHash } from "crypto";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
export type TTSSpeed = 0.25 | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 1.75 | 2.0;

export interface TTSOptions {
  voice?: TTSVoice;
  speed?: TTSSpeed;
  model?: "tts-1" | "tts-1-hd";
}

const audioCache = new Map<string, Buffer>();

function generateCacheKey(text: string, options: TTSOptions): string {
  const key = `${text}-${options.voice || "alloy"}-${options.speed || 1.0}-${options.model || "tts-1"}`;
  return createHash("md5").update(key).digest("hex");
}

export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const cacheKey = generateCacheKey(text, options);

  const cached = audioCache.get(cacheKey);
  if (cached) {
    console.log(`TTS cache hit for: ${cacheKey.slice(0, 8)}...`);
    return cached;
  }

  try {
    const response = await openai.audio.speech.create({
      model: options.model || "tts-1",
      voice: options.voice || "alloy",
      input: text,
      speed: options.speed || 1.0,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    audioCache.set(cacheKey, buffer);
    console.log(`TTS generated and cached: ${cacheKey.slice(0, 8)}...`);

    return buffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate speech");
  }
}

export function clearTTSCache(): void {
  audioCache.clear();
  console.log("TTS cache cleared");
}

export function getCacheSize(): number {
  return audioCache.size;
}

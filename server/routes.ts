import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { generateCoachingResponses, transcribeAudio } from "./ai/openai-client";
import { generateConversationalResponse } from "./ai/gemini-client";
import { generateSpeech, type TTSOptions } from "./ai/tts";
import { RealtimeClient } from "./ai/realtime-client";
import { insertVoiceMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const upload = multer({ storage: multer.memoryStorage() });

  // Process voice message with AI coaching
  app.post("/api/voice-message", upload.single("audio"), async (req, res) => {
    try {
      let transcript = "";
      
      // If audio file is provided, transcribe it
      if (req.file) {
        transcript = await transcribeAudio(req.file.buffer);
      } else if (req.body.transcript) {
        // Use provided transcript (for testing/mock)
        transcript = req.body.transcript;
      } else {
        return res.status(400).json({ error: "Audio file or transcript required" });
      }

      // Generate coaching responses and conversational AI response
      const [coachingResponses, aiResponse] = await Promise.all([
        generateCoachingResponses(transcript),
        generateConversationalResponse(transcript)
      ]);

      const responses = {
        ...coachingResponses,
        ai: aiResponse
      };

      // Store the voice message
      const voiceMessage = await storage.createVoiceMessage({
        userMessage: transcript,
        audioUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
        responses
      });

      res.json({
        id: voiceMessage.id,
        userMessage: transcript,
        responses,
        timestamp: voiceMessage.timestamp
      });
    } catch (error) {
      console.error("Error processing voice message:", error);
      res.status(500).json({ error: "Failed to process voice message" });
    }
  });

  // Get voice message history
  app.get("/api/voice-messages", async (req, res) => {
    try {
      const messages = await storage.getVoiceMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching voice messages:", error);
      res.status(500).json({ error: "Failed to fetch voice messages" });
    }
  });

  // Get specific voice message
  app.get("/api/voice-messages/:id", async (req, res) => {
    try {
      const message = await storage.getVoiceMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Voice message not found" });
      }
      res.json(message);
    } catch (error) {
      console.error("Error fetching voice message:", error);
      res.status(500).json({ error: "Failed to fetch voice message" });
    }
  });

  // Test endpoint for coaching without audio
  app.post("/api/coaching", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const [coachingResponses, aiResponse] = await Promise.all([
        generateCoachingResponses(message),
        generateConversationalResponse(message)
      ]);

      res.json({
        userMessage: message,
        responses: {
          ...coachingResponses,
          ai: aiResponse
        }
      });
    } catch (error) {
      console.error("Error generating coaching responses:", error);
      res.status(500).json({ error: "Failed to generate coaching responses" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice, speed, model } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const options: TTSOptions = {
        voice: voice || "alloy",
        speed: speed || 1.0,
        model: model || "tts-1"
      };

      const audioBuffer = await generateSpeech(text, options);

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length,
        "Cache-Control": "public, max-age=31536000"
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating TTS:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: "/api/realtime" });

  wss.on("connection", async (ws: WebSocket) => {
    console.log("Client connected to realtime endpoint");

    let realtimeClient: RealtimeClient | null = null;

    try {
      if (!process.env.OPENAI_API_KEY) {
        console.error("OpenAI API key not configured");
        ws.send(JSON.stringify({ type: "error", message: "OpenAI API key not configured" }));
        ws.close();
        return;
      }

      console.log("Creating realtime client...");
      realtimeClient = new RealtimeClient({
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-5-realtime-preview",
        voice: "alloy",
        instructions: "You are an AI communication coach. Help users improve their speaking, provide feedback on their communication style, and engage in natural conversation. Be supportive, clear, and constructive."
      });

      console.log("Connecting to OpenAI Realtime API...");
      await realtimeClient.connect();
      console.log("Successfully connected to OpenAI Realtime API");

      realtimeClient.on("*", (message) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === "audio") {
            const audioBuffer = Buffer.from(message.data, "base64");
            const int16Array = new Int16Array(
              audioBuffer.buffer,
              audioBuffer.byteOffset,
              audioBuffer.length / 2
            );
            realtimeClient?.sendAudio(int16Array);
          } else if (message.type === "commit") {
            realtimeClient?.commitAudio();
          } else if (message.type === "text") {
            realtimeClient?.sendText(message.text);
          } else {
            realtimeClient?.send(message);
          }
        } catch (error) {
          console.error("Error handling client message:", error);
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected from realtime");
        realtimeClient?.disconnect();
      });

    } catch (error) {
      console.error("Error setting up realtime connection:", error);
      ws.send(JSON.stringify({ type: "error", message: `Failed to connect to realtime API: ${error}` }));
      ws.close();
    }
  });

  return httpServer;
}

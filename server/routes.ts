import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { generateCoachingResponses, transcribeAudio } from "./ai/openai-client";
import { generateConversationalResponse } from "./ai/gemini-client";
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

  const httpServer = createServer(app);
  return httpServer;
}

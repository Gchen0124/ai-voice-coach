import { WebSocket } from "ws";

export interface RealtimeConfig {
  apiKey: string;
  model?: string;
  voice?: "alloy" | "echo" | "shimmer";
  instructions?: string;
}

export interface RealtimeMessage {
  type: string;
  [key: string]: any;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private model: string;
  private voice: string;
  private instructions: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(config: RealtimeConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gpt-5-realtime-preview";
    this.voice = config.voice || "alloy";
    this.instructions = config.instructions || "You are a helpful AI coach having a natural conversation.";
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(
          "wss://api.openai.com/v1/realtime?model=" + this.model,
          {
            headers: {
              "Authorization": `Bearer ${this.apiKey}`,
              "OpenAI-Beta": "realtime=v1",
            },
          }
        );

        this.ws.on("open", () => {
          console.log("Realtime API connected");
          this.send({
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              voice: this.voice,
              instructions: this.instructions,
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          });
          resolve();
        });

        this.ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        });

        this.ws.on("error", (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        });

        this.ws.on("close", () => {
          console.log("Realtime API disconnected");
          this.ws = null;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: RealtimeMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    const globalHandler = this.messageHandlers.get("*");
    if (globalHandler) {
      globalHandler(message);
    }
  }

  on(eventType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(eventType, handler);
  }

  send(message: RealtimeMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  sendAudio(audioData: Int16Array): void {
    this.send({
      type: "input_audio_buffer.append",
      audio: Buffer.from(audioData.buffer).toString("base64"),
    });
  }

  commitAudio(): void {
    this.send({
      type: "input_audio_buffer.commit",
    });
  }

  sendText(text: string): void {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: text,
          },
        ],
      },
    });

    this.send({
      type: "response.create",
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

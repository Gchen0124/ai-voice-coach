import { type User, type InsertUser, type VoiceMessage, type InsertVoiceMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createVoiceMessage(voiceMessage: InsertVoiceMessage): Promise<VoiceMessage>;
  getVoiceMessages(): Promise<VoiceMessage[]>;
  getVoiceMessage(id: string): Promise<VoiceMessage | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private voiceMessages: Map<string, VoiceMessage>;

  constructor() {
    this.users = new Map();
    this.voiceMessages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createVoiceMessage(insertVoiceMessage: InsertVoiceMessage): Promise<VoiceMessage> {
    const id = randomUUID();
    const voiceMessage: VoiceMessage = { 
      ...insertVoiceMessage,
      id,
      audioUrl: insertVoiceMessage.audioUrl || null,
      timestamp: new Date()
    };
    this.voiceMessages.set(id, voiceMessage);
    return voiceMessage;
  }

  async getVoiceMessages(): Promise<VoiceMessage[]> {
    return Array.from(this.voiceMessages.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getVoiceMessage(id: string): Promise<VoiceMessage | undefined> {
    return this.voiceMessages.get(id);
  }
}

export const storage = new MemStorage();

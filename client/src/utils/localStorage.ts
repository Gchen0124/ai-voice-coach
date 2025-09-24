// Local storage utilities for voice messages and chat history

export interface StoredVoiceMessage {
  id: string;
  userMessage: string;
  audioBlob?: string; // Base64 encoded audio data
  responses: {
    accent: string;
    language: string;
    executive: string;
    ai: string;
  };
  timestamp: string;
}

const VOICE_MESSAGES_KEY = 'ai-coach-voice-messages';
const MAX_STORED_MESSAGES = 50; // Limit to prevent storage bloat

// Convert Blob to base64 for storage
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert base64 back to Blob
const base64ToBlob = (base64: string): Blob => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'audio/wav' });
};

export const saveVoiceMessage = async (
  id: string,
  userMessage: string,
  audioBlob: Blob,
  responses: StoredVoiceMessage['responses']
): Promise<void> => {
  try {
    const messages = getStoredVoiceMessages();
    
    // Convert audio blob to base64 for storage
    const audioBase64 = await blobToBase64(audioBlob);
    
    const newMessage: StoredVoiceMessage = {
      id,
      userMessage,
      audioBlob: audioBase64,
      responses,
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array (most recent first)
    messages.unshift(newMessage);
    
    // Keep only the most recent messages
    const limitedMessages = messages.slice(0, MAX_STORED_MESSAGES);
    
    localStorage.setItem(VOICE_MESSAGES_KEY, JSON.stringify(limitedMessages));
  } catch (error) {
    console.error('Error saving voice message to localStorage:', error);
  }
};

export const getStoredVoiceMessages = (): StoredVoiceMessage[] => {
  try {
    const stored = localStorage.getItem(VOICE_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading voice messages from localStorage:', error);
    return [];
  }
};

export const getStoredAudioBlob = (messageId: string): Blob | null => {
  try {
    const messages = getStoredVoiceMessages();
    const message = messages.find(m => m.id === messageId);
    
    if (message && message.audioBlob) {
      return base64ToBlob(message.audioBlob);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving audio blob:', error);
    return null;
  }
};

export const clearStoredVoiceMessages = (): void => {
  try {
    localStorage.removeItem(VOICE_MESSAGES_KEY);
  } catch (error) {
    console.error('Error clearing voice messages:', error);
  }
};

export const getStorageInfo = (): { messageCount: number; storageSize: string } => {
  try {
    const messages = getStoredVoiceMessages();
    const stored = localStorage.getItem(VOICE_MESSAGES_KEY) || '';
    const sizeInBytes = new Blob([stored]).size;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    
    return {
      messageCount: messages.length,
      storageSize: `${sizeInMB} MB`
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { messageCount: 0, storageSize: '0 MB' };
  }
};
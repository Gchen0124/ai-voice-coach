import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Send, Save } from 'lucide-react';
import { useRealtimeAPI } from '@/hooks/useRealtimeAPI';
import { Input } from '@/components/ui/input';
import { saveSession, saveAudioBlob } from '@/utils/indexedDB';
import { useToast } from '@/hooks/use-toast';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  id: string;
}

export default function LiveConversation() {
  const {
    isConnected,
    connectionError,
    messages,
    transcript,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendText,
  } = useRealtimeAPI();

  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [currentUserInput, setCurrentUserInput] = useState<string>('');
  const processedMessageIds = useRef<Set<string>>(new Set());
  const lastAssistantContent = useRef<string>('');
  const { toast } = useToast();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    messages.forEach(msg => {
      const msgId = msg.event_id || `${msg.type}-${msg.timestamp || Date.now()}`;

      if (processedMessageIds.current.has(msgId)) {
        return;
      }

      if (msg.type === 'conversation.item.created') {
        processedMessageIds.current.add(msgId);

        if (msg.item?.role === 'user' && msg.item?.content) {
          const textContent = msg.item.content.find((c: any) => c.type === 'input_text' || c.type === 'text');
          if (textContent && textContent.text) {
            const userMessage = textContent.text;
            setCurrentUserInput(userMessage);
            setConversation(prev => [...prev, {
              role: 'user',
              content: userMessage,
              timestamp: Date.now(),
              id: msgId,
            }]);
          }
        }
      }

      if (msg.type === 'response.done') {
        processedMessageIds.current.add(msgId);

        if (msg.response?.output && msg.response.output.length > 0) {
          const output = msg.response.output[0];
          if (output.content && output.content.length > 0) {
            const textContent = output.content.find((c: any) => c.type === 'text');
            if (textContent && textContent.text) {
              if (lastAssistantContent.current !== textContent.text) {
                lastAssistantContent.current = textContent.text;
                setConversation(prev => [...prev, {
                  role: 'assistant',
                  content: textContent.text,
                  timestamp: Date.now(),
                  id: msgId,
                }]);
              }
            }
          }
        }
      }
    });
  }, [messages]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setIsRecording(false);
    } else {
      startRecording();
      setIsRecording(true);
    }
  };

  const handleSendText = () => {
    if (textInput.trim()) {
      sendText(textInput);
      setTextInput('');
    }
  };

  const saveToFocusMode = async (userMsg: string, gpt5Response: string) => {
    try {
      const response = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });

      if (!response.ok) {
        throw new Error('Failed to get coaching responses');
      }

      const result = await response.json();

      const sessionId = `live-${Date.now()}`;
      const audioKey = `audio-${sessionId}`;

      await saveAudioBlob(audioKey, new Blob());

      await saveSession({
        id: sessionId,
        userMessage: userMsg,
        responses: {
          accent: result.responses.accent,
          language: result.responses.language,
          executive: result.responses.executive,
          ai: gpt5Response
        },
        timestamp: Date.now(),
        audioKey
      });

      toast({
        title: "Saved to Focus Mode",
        description: "This conversation turn has been analyzed and saved as a session.",
      });
    } catch (error) {
      console.error('Error saving to Focus Mode:', error);
      toast({
        title: "Save Failed",
        description: "Could not save to Focus Mode. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Conversation</h1>
          <p className="text-muted-foreground">Real-time GPT-5 coaching conversation</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {!isConnected && (
            <Button size="sm" onClick={connect} variant="outline">
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {connectionError && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <p className="text-sm text-destructive">
            <strong>Connection Error:</strong> {connectionError}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Please check your OpenAI API key and try reconnecting.
          </p>
        </Card>
      )}

      <Card className="p-6 min-h-[500px] max-h-[500px] overflow-y-auto space-y-4">
        {conversation.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            <p>Start speaking or type to begin your coaching session</p>
          </div>
        ) : (
          conversation.map((msg, idx) => {
            const nextMsg = conversation[idx + 1];
            const isPair = msg.role === 'user' && nextMsg?.role === 'assistant';

            return (
              <div key={msg.id}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-xs opacity-70 mb-1">
                      {msg.role === 'user' ? 'You' : 'AI Coach'}
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
                {isPair && (
                  <div className="flex justify-center my-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => saveToFocusMode(msg.content, nextMsg.content)}
                      className="text-xs"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Analyze in Focus Mode
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>

      {transcript && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
          <p className="text-sm">
            <span className="font-medium">Live Transcript: </span>
            {transcript}
          </p>
        </Card>
      )}

      <div className="flex gap-4 items-center">
        <Button
          size="lg"
          className={`w-16 h-16 rounded-full ${
            isRecording ? 'bg-destructive hover:bg-destructive/90 animate-pulse' : ''
          }`}
          onClick={handleToggleRecording}
          disabled={!isConnected}
        >
          {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        <Input
          placeholder="Type your message..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
          disabled={!isConnected}
          className="flex-1"
        />

        <Button onClick={handleSendText} disabled={!isConnected || !textInput.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {isRecording && (
        <div className="flex justify-center space-x-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-destructive rounded-full animate-pulse"
              style={{
                height: Math.random() * 30 + 20,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

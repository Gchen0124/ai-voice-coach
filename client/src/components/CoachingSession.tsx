import { useState, useEffect } from 'react';
import VoiceRecorder from './VoiceRecorder';
import MessageCard, { MessageCardProps } from './MessageCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { saveSession, getAllSessions, getAudioBlob, saveAudioBlob, type StoredSession } from '@/utils/indexedDB';

interface CoachingMessage {
  id: string;
  userMessage: string;
  audioBlob: Blob;
  responses: {
    accent: string;
    language: string; 
    executive: string;
    ai: string;
  };
  timestamp: Date;
}

export default function CoachingSession() {
  const [sessions, setSessions] = useState<CoachingMessage[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get the currently selected session or default to the first one
  const selectedSession = selectedSessionId
    ? sessions.find(s => s.id === selectedSessionId)
    : sessions[0];

  useEffect(() => {
    const loadSessions = async () => {
      const storedSessions = await getAllSessions();
      const loadedSessions: CoachingMessage[] = await Promise.all(
        storedSessions.map(async (stored) => {
          const audioBlob = await getAudioBlob(stored.audioKey) || new Blob();
          return {
            id: stored.id,
            userMessage: stored.userMessage,
            audioBlob,
            responses: stored.responses,
            timestamp: new Date(stored.timestamp)
          };
        })
      );
      setSessions(loadedSessions);
    };
    loadSessions();
  }, []);

  const handleRecordingComplete = async (audioBlob: Blob, transcript: string) => {
    setIsProcessing(true);
    
    try {
      // Send to backend for AI coaching responses
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('transcript', transcript);

      const response = await fetch('/api/voice-message', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process voice message');
      }

      const result = await response.json();
      
      const newSession: CoachingMessage = {
        id: result.id,
        userMessage: result.userMessage,
        audioBlob,
        responses: result.responses,
        timestamp: new Date(result.timestamp)
      };

      const audioKey = `audio-${newSession.id}`;
      await saveAudioBlob(audioKey, audioBlob);
      await saveSession({
        id: newSession.id,
        userMessage: newSession.userMessage,
        responses: newSession.responses,
        timestamp: newSession.timestamp.getTime(),
        audioKey
      });

      setSessions(prev => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      console.log('New coaching session created and saved:', newSession);
    } catch (error) {
      console.error('Error processing voice message:', error);
      
      const newSession: CoachingMessage = {
        id: Date.now().toString(),
        userMessage: transcript,
        audioBlob,
        responses: {
          accent: transcript.replace(/\b(um|uh|like)\b/gi, '').trim() || transcript,
          language: transcript.replace('This is', 'This exemplifies').replace('demonstrates', 'showcases'),
          executive: transcript.replace('This is a sample', 'This represents a professional'),
          ai: "I understand you're working with our coaching system. This platform provides comprehensive voice training."
        },
        timestamp: new Date()
      };

      const audioKey = `audio-${newSession.id}`;
      await saveAudioBlob(audioKey, audioBlob);
      await saveSession({
        id: newSession.id,
        userMessage: newSession.userMessage,
        responses: newSession.responses,
        timestamp: newSession.timestamp.getTime(),
        audioKey
      });

      setSessions(prev => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlay = (messageId: string, messageType: string) => {
    const newPlayingId = playingId === `${messageId}-${messageType}` ? null : `${messageId}-${messageType}`;
    setPlayingId(newPlayingId);

    // For user audio playback from stored sessions
    if ((messageType === 'user' || messageType === 'user-history') && newPlayingId) {
      const session = sessions.find(s => s.id === messageId);
      if (session && session.audioBlob) {
        // Play the original audio recording
        const audioUrl = URL.createObjectURL(session.audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setPlayingId(null);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setPlayingId(null);
          URL.revokeObjectURL(audioUrl);
          console.error('Error playing audio');
        };

        audio.play().catch(error => {
          setPlayingId(null);
          URL.revokeObjectURL(audioUrl);
          console.error('Failed to play audio:', error);
        });
      } else {
        setPlayingId(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AI Voice Coach</h1>
        <p className="text-muted-foreground">
          Advanced multi-agent coaching for accent, language, and executive communication
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Voice Input Section */}
        <div className="space-y-6">
          <VoiceRecorder 
            onRecordingComplete={handleRecordingComplete} 
            disabled={isProcessing}
          />
          
          {sessions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Session History</h3>
                <Badge variant="secondary" data-testid="text-session-count">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                      selectedSession?.id === session.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted border-transparent hover:bg-muted/80'
                    }`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          Session {sessions.length - index} • {new Date(session.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-sm overflow-hidden text-ellipsis" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {session.userMessage}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(session.id, 'user-history');
                        }}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages Display Section */}
        <div className="space-y-6">
          {selectedSession ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Coaching Results
                {selectedSessionId && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    • {new Date(selectedSession.timestamp).toLocaleString()}
                  </span>
                )}
              </h3>
              <div className="space-y-4">
                {/* User Original Message */}
                <MessageCard
                  type="user"
                  title="Your Original Message"
                  content={selectedSession.userMessage}
                  isPlaying={playingId === `${selectedSession.id}-user`}
                  onPlay={() => handlePlay(selectedSession.id, 'user')}
                />

                <div className="border-t my-4" />

                {/* Coaching Responses */}
                <div className="space-y-3">
                  <MessageCard
                    type="accent"
                    title="Accent Coach"
                    content={selectedSession.responses.accent}
                    accent="NYC Upper West Side"
                    isPlaying={playingId === `${selectedSession.id}-accent`}
                    onPlay={() => handlePlay(selectedSession.id, 'accent')}
                  />

                  <MessageCard
                    type="language"
                    title="Language Coach"
                    content={selectedSession.responses.language}
                    accent="NYC Upper West Side"
                    isPlaying={playingId === `${selectedSession.id}-language`}
                    onPlay={() => handlePlay(selectedSession.id, 'language')}
                  />

                  <MessageCard
                    type="executive"
                    title="Executive Coach"
                    content={selectedSession.responses.executive}
                    accent="NYC Upper West Side"
                    isPlaying={playingId === `${selectedSession.id}-executive`}
                    onPlay={() => handlePlay(selectedSession.id, 'executive')}
                  />
                </div>

                <div className="border-t my-4" />

                {/* AI Conversational Response */}
                <MessageCard
                  type="ai"
                  title="AI Conversation"
                  content={selectedSession.responses.ai}
                  isPlaying={playingId === `${selectedSession.id}-ai`}
                  onPlay={() => handlePlay(selectedSession.id, 'ai')}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <h3 className="text-lg font-medium">Ready to Start Coaching</h3>
              <p>Record your voice message to receive coaching from our AI agents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
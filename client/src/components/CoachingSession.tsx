import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import MessageCard, { MessageCardProps } from './MessageCard';
import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';

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
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Mock AI responses - todo: remove mock functionality
  const generateMockResponses = (userMessage: string) => {
    return {
      accent: userMessage.replace(/\b(um|uh|like)\b/gi, '').trim() || userMessage,
      language: userMessage
        .replace('This is', 'This exemplifies')
        .replace('demonstrates', 'showcases')
        .replace('system', 'platform'),
      executive: userMessage
        .replace('This is a sample', 'This represents a professional')
        .replace('voice message', 'communication')
        .replace('coaching system', 'leadership development platform'),
      ai: `I understand you're working with our coaching system. ${userMessage.includes('sample') ? 'This platform provides comprehensive voice training across multiple dimensions including accent refinement, language enhancement, and executive communication skills.' : 'How can I assist you further with your communication goals?'}`
    };
  };

  const handleRecordingComplete = (audioBlob: Blob, transcript: string) => {
    const newSession: CoachingMessage = {
      id: Date.now().toString(),
      userMessage: transcript,
      audioBlob,
      responses: generateMockResponses(transcript),
      timestamp: new Date()
    };

    setSessions(prev => [newSession, ...prev]);
    console.log('New coaching session created:', newSession);
  };

  const handlePlay = (messageId: string, messageType: string) => {
    const newPlayingId = playingId === `${messageId}-${messageType}` ? null : `${messageId}-${messageType}`;
    setPlayingId(newPlayingId);
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
          <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
          
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
                  <div key={session.id} className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      Session {sessions.length - index}
                    </div>
                    <div className="text-sm">{session.userMessage}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages Display Section */}
        <div className="space-y-6">
          {sessions.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Latest Coaching Results</h3>
              <div className="space-y-4">
                {/* User Original Message */}
                <MessageCard
                  type="user"
                  title="Your Original Message"
                  content={sessions[0].userMessage}
                  isPlaying={playingId === `${sessions[0].id}-user`}
                  onPlay={() => handlePlay(sessions[0].id, 'user')}
                />

                <div className="border-t my-4" />

                {/* Coaching Responses */}
                <div className="space-y-3">
                  <MessageCard
                    type="accent"
                    title="Accent Coach"
                    content={sessions[0].responses.accent}
                    accent="NYC Upper West Side"
                    isPlaying={playingId === `${sessions[0].id}-accent`}
                    onPlay={() => handlePlay(sessions[0].id, 'accent')}
                  />
                  
                  <MessageCard
                    type="language"
                    title="Language Coach"
                    content={sessions[0].responses.language}
                    accent="NYC Upper West Side"
                    isPlaying={playingId === `${sessions[0].id}-language`}
                    onPlay={() => handlePlay(sessions[0].id, 'language')}
                  />
                  
                  <MessageCard
                    type="executive"
                    title="Executive Coach"
                    content={sessions[0].responses.executive}
                    accent="NYC Upper West Side"
                    isPlaying={playingId === `${sessions[0].id}-executive`}
                    onPlay={() => handlePlay(sessions[0].id, 'executive')}
                  />
                </div>

                <div className="border-t my-4" />

                {/* AI Conversational Response */}
                <MessageCard
                  type="ai"
                  title="AI Conversation"
                  content={sessions[0].responses.ai}
                  isPlaying={playingId === `${sessions[0].id}-ai`}
                  onPlay={() => handlePlay(sessions[0].id, 'ai')}
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
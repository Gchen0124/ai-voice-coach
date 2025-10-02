import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, RefreshCw } from 'lucide-react';
import { getAllSessions, getAudioBlob, saveSession, type StoredSession } from '@/utils/indexedDB';
import MessageCard from './MessageCard';

interface Session {
  id: string;
  userMessage: string;
  audioBlob: Blob | null;
  responses: {
    accent?: string;
    language?: string;
    executive?: string;
    ai: string;
  };
  timestamp: Date;
  fromLiveMode: boolean;
  coachingLoading?: boolean;
}

export default function FocusMode() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const storedSessions = await getAllSessions();
      console.log('📋 Loaded sessions from IndexedDB:', storedSessions.length);

      const loadedSessions: Session[] = await Promise.all(
        storedSessions.map(async (stored) => {
          const audioBlob = await getAudioBlob(stored.audioKey);
          console.log('🔊 Loading audio for session:', {
            sessionId: stored.id,
            audioKey: stored.audioKey,
            audioBlobSize: audioBlob?.size || 0,
            hasAudio: !!audioBlob && audioBlob.size > 0
          });
          return {
            id: stored.id,
            userMessage: stored.userMessage,
            audioBlob,
            responses: stored.responses,
            timestamp: new Date(stored.timestamp),
            fromLiveMode: stored.fromLiveMode || false,
            coachingLoading: false
          };
        })
      );

      console.log('📊 Sessions loaded:', loadedSessions.map(s => ({
        id: s.id,
        message: s.userMessage.substring(0, 50),
        fromLiveMode: s.fromLiveMode,
        timestamp: s.timestamp.toLocaleTimeString()
      })));

      setSessions(loadedSessions);
      if (loadedSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(loadedSessions[0].id);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const loadCoachingResponses = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || (session.responses.accent && session.responses.language && session.responses.executive)) {
      return;
    }

    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, coachingLoading: true } : s
    ));

    try {
      const response = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: session.userMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to get coaching responses');
      }

      const result = await response.json();

      const updatedSession: StoredSession = {
        id: session.id,
        userMessage: session.userMessage,
        responses: {
          accent: result.responses.accent,
          language: result.responses.language,
          executive: result.responses.executive,
          ai: session.responses.ai || result.responses.ai
        },
        timestamp: session.timestamp.getTime(),
        audioKey: `audio-${session.id}`,
        fromLiveMode: session.fromLiveMode
      };

      await saveSession(updatedSession);

      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              responses: updatedSession.responses,
              coachingLoading: false
            }
          : s
      ));
    } catch (error) {
      console.error('Error loading coaching responses:', error);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, coachingLoading: false } : s
      ));
    }
  };

  const selectedSession = selectedSessionId
    ? sessions.find(s => s.id === selectedSessionId)
    : sessions[0];

  useEffect(() => {
    if (selectedSession && selectedSession.fromLiveMode && !selectedSession.responses.accent) {
      loadCoachingResponses(selectedSession.id);
    }
  }, [selectedSessionId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-12 text-center">
          <CardTitle className="text-2xl mb-4">No Sessions Yet</CardTitle>
          <p className="text-muted-foreground mb-6">
            Start a conversation in Live Mode to create your first session.
          </p>
          <p className="text-sm text-muted-foreground">
            Each time you speak in Live Mode, it will be automatically saved here for detailed coaching analysis.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Focus Mode</h1>
          <p className="text-muted-foreground">Review your Live Mode sessions and get detailed coaching feedback</p>
        </div>
        <Button onClick={loadSessions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session History</CardTitle>
              <p className="text-xs text-muted-foreground">{sessions.length} sessions</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-4 border-b hover:bg-muted/50 transition-colors ${
                      selectedSessionId === session.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium line-clamp-2 flex-1">
                        {session.userMessage}
                      </p>
                      {session.fromLiveMode && (
                        <Badge variant="secondary" className="text-xs shrink-0">Live</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.timestamp.toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-9">
          {selectedSession ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>Your Message</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedSession.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {selectedSession.audioBlob && selectedSession.audioBlob.size > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const audio = new Audio(URL.createObjectURL(selectedSession.audioBlob!));
                          audio.play();
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play Recording
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">{selectedSession.userMessage}</p>
                </CardContent>
              </Card>

              {selectedSession.coachingLoading ? (
                <Card className="p-12">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading coaching feedback...</p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {selectedSession.responses.accent && (
                    <MessageCard
                      type="accent"
                      title="Accent Coach"
                      content={selectedSession.responses.accent}
                      onPlay={() => {}}
                    />
                  )}
                  {selectedSession.responses.language && (
                    <MessageCard
                      type="language"
                      title="Language Coach"
                      content={selectedSession.responses.language}
                      onPlay={() => {}}
                    />
                  )}
                  {selectedSession.responses.executive && (
                    <MessageCard
                      type="executive"
                      title="Executive Coach"
                      content={selectedSession.responses.executive}
                      onPlay={() => {}}
                    />
                  )}
                  {selectedSession.responses.ai && (
                    <MessageCard
                      type="ai"
                      title="AI Conversation"
                      content={selectedSession.responses.ai}
                      onPlay={() => {}}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Select a session to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

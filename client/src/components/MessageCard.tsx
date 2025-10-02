import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, Loader2 } from 'lucide-react';
import { getTTSAudio, saveTTSAudio } from '@/utils/indexedDB';

export interface MessageCardProps {
  type: 'user' | 'accent' | 'language' | 'executive' | 'ai';
  title: string;
  content: string;
  isPlaying?: boolean;
  onPlay: () => void;
  accent?: string;
  voice?: string;
  speed?: number;
}

const MESSAGE_COLORS = {
  user: 'bg-muted',
  accent: 'bg-blue-50 dark:bg-blue-950/30',
  language: 'bg-green-50 dark:bg-green-950/30',
  executive: 'bg-purple-50 dark:bg-purple-950/30',
  ai: 'bg-orange-50 dark:bg-orange-950/30'
};

const MESSAGE_BADGES = {
  user: { label: 'Original', variant: 'secondary' as const },
  accent: { label: 'Accent Coach', variant: 'default' as const },
  language: { label: 'Language Coach', variant: 'default' as const },
  executive: { label: 'Executive Coach', variant: 'default' as const },
  ai: { label: 'AI Response', variant: 'default' as const }
};

export default function MessageCard({
  type,
  title,
  content,
  isPlaying = false,
  onPlay,
  accent,
  voice = 'alloy',
  speed = 1.0
}: MessageCardProps) {
  const [localPlaying, setLocalPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playWebSpeechAPI = () => {
    if (!('speechSynthesis' in window)) {
      console.error('Web Speech API not available');
      setLocalPlaying(false);
      setIsLoading(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);

    const setupVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();

      const preferredVoice = voices.find(v =>
        v.lang.includes('en-US') &&
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Alex'))
      ) || voices.find(v => v.lang.includes('en-US')) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = speed;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setLocalPlaying(false);
        setIsLoading(false);
      };

      utterance.onerror = () => {
        setLocalPlaying(false);
        setIsLoading(false);
        console.error('Speech synthesis error');
      };

      window.speechSynthesis.speak(utterance);
      setIsLoading(false);
      setUsingFallback(true);
      console.log(`Playing ${type} message with Web Speech API (fallback)`);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setupVoiceAndSpeak();
    } else {
      const voicesChangedHandler = () => {
        setupVoiceAndSpeak();
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
      };
      window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);

      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        setupVoiceAndSpeak();
      }, 1000);
    }
  };

  const playOpenAITTS = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoading(true);

    try {
      let cachedAudio = await getTTSAudio(content, voice, speed);

      if (!cachedAudio) {
        console.log('Fetching TTS from API...');
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content, voice, speed, model: 'tts-1' })
        });

        if (!response.ok) {
          throw new Error(`TTS API request failed: ${response.status}`);
        }

        cachedAudio = await response.blob();
        console.log('TTS received, caching...');
        await saveTTSAudio(content, voice, speed, cachedAudio);
      } else {
        console.log('Using cached TTS');
      }

      const audioUrl = URL.createObjectURL(cachedAudio);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setLocalPlaying(false);
        setIsLoading(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setLocalPlaying(false);
        setIsLoading(false);
        URL.revokeObjectURL(audioUrl);

        console.log('OpenAI TTS failed, falling back to Web Speech API');
        playWebSpeechAPI();
      };

      await audio.play();
      setIsLoading(false);
      setUsingFallback(false);
      console.log(`Playing ${type} message with OpenAI TTS`);
    } catch (error) {
      console.error('Error with OpenAI TTS:', error);
      console.log('Falling back to Web Speech API');
      playWebSpeechAPI();
    }
  };

  const handlePlay = () => {
    if (localPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setLocalPlaying(false);
      setIsLoading(false);
      console.log(`Stopped ${type} message`);
    } else {
      setLocalPlaying(true);
      onPlay();
      playOpenAITTS();
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cardColor = MESSAGE_COLORS[type];
  const badge = MESSAGE_BADGES[type];

  return (
    <Card className={`${cardColor} hover-elevate transition-all duration-200`} data-testid={`card-message-${type}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant={badge.variant} className="text-xs">
            {badge.label}
            {usingFallback && localPlaying && ' (Fallback)'}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="w-8 h-8 shrink-0"
          onClick={handlePlay}
          disabled={isLoading}
          data-testid={`button-play-${type}`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying || localPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-relaxed">{content}</p>
        {accent && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Volume2 className="w-3 h-3" />
            <span>{accent}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

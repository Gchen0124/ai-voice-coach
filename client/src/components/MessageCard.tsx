import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2 } from 'lucide-react';

export interface MessageCardProps {
  type: 'user' | 'accent' | 'language' | 'executive' | 'ai';
  title: string;
  content: string;
  isPlaying?: boolean;
  onPlay: () => void;
  accent?: string;
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
  accent 
}: MessageCardProps) {
  const [localPlaying, setLocalPlaying] = useState(false);

  const playTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      
      const utterance = new SpeechSynthesisUtterance(content);
      
      const setupVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Configure for NYC accent (closest available)
        const preferredVoice = voices.find(voice => 
          voice.lang.includes('en-US') && 
          (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Alex'))
        ) || voices.find(voice => voice.lang.includes('en-US')) || voices[0];
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        
        utterance.onend = () => {
          setLocalPlaying(false);
        };
        
        utterance.onerror = () => {
          setLocalPlaying(false);
          console.error('Speech synthesis error');
        };
        
        window.speechSynthesis.speak(utterance);
        console.log(`Playing ${type} message${accent ? ` with ${accent} accent` : ''}`);
      };
      
      // Handle async voice loading
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setupVoiceAndSpeak();
      } else {
        // Wait for voices to load
        const voicesChangedHandler = () => {
          setupVoiceAndSpeak();
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        };
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
        
        // Fallback timeout in case voiceschanged never fires
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          setupVoiceAndSpeak();
        }, 1000);
      }
    } else {
      console.log(`Speech synthesis not available. Would play ${type} message: ${content}`);
      // Simulate playback duration
      setTimeout(() => setLocalPlaying(false), 3000);
    }
  };

  const handlePlay = () => {
    setLocalPlaying(!localPlaying);
    onPlay();
    
    if (!localPlaying) {
      playTTS();
    } else {
      // Stop TTS playback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      console.log(`Stopped ${type} message`);
    }
  };

  const cardColor = MESSAGE_COLORS[type];
  const badge = MESSAGE_BADGES[type];

  return (
    <Card className={`${cardColor} hover-elevate transition-all duration-200`} data-testid={`card-message-${type}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant={badge.variant} className="text-xs">
            {badge.label}
          </Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="w-8 h-8 shrink-0"
          onClick={handlePlay}
          data-testid={`button-play-${type}`}
        >
          {isPlaying || localPlaying ? (
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
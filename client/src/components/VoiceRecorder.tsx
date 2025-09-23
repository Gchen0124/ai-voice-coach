import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Square } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcript: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const mockTranscript = "This is a sample voice message that demonstrates the coaching system.";
        
        setIsProcessing(true);
        // Simulate STT processing
        setTimeout(() => {
          onRecordingComplete(audioBlob, mockTranscript);
          setIsProcessing(false);
        }, 1500);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };

  return (
    <Card className="p-8 text-center space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Voice Input</h2>
        <p className="text-muted-foreground">
          {isRecording ? 'Recording your voice...' : 
           isProcessing ? 'Processing your message...' :
           'Tap the microphone to start recording your message'}
        </p>
      </div>

      <div className="flex justify-center">
        <Button
          size="icon"
          className={`w-20 h-20 rounded-full transition-all duration-200 ${
            isRecording 
              ? 'bg-destructive hover:bg-destructive/90 animate-pulse' 
              : 'bg-primary hover:bg-primary/90'
          }`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isProcessing}
          data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
        >
          {isRecording ? (
            <Square className="w-8 h-8" />
          ) : isProcessing ? (
            <MicOff className="w-8 h-8 animate-spin" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>
      </div>

      {isRecording && (
        <div className="flex justify-center space-x-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full animate-pulse"
              style={{
                height: Math.random() * 30 + 20,
                animationDelay: `${i * 100}ms`
              }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
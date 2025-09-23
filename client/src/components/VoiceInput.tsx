import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Square } from "lucide-react";

interface VoiceInputProps {
  onVoiceMessage?: (audioBlob: Blob, transcript: string) => void;
  isDisabled?: boolean;
}

export default function VoiceInput({ onVoiceMessage, isDisabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  const handleStartRecording = async () => {
    console.log('Starting voice recording...');
    setIsRecording(true);
    
    // TODO: Implement actual voice recording with Web Speech API
    // For now, simulate recording
    setTimeout(() => {
      handleStopRecording();
    }, 3000);
  };
  
  const handleStopRecording = () => {
    console.log('Stopping voice recording...');
    setIsRecording(false);
    setIsPending(true);
    
    // TODO: Process recording and get transcript
    // Simulate processing
    setTimeout(() => {
      const mockTranscript = "Hello, this is a sample voice message for testing the coaching interface.";
      const mockBlob = new Blob(); // TODO: Replace with actual audio blob
      
      onVoiceMessage?.(mockBlob, mockTranscript);
      setIsPending(false);
    }, 1500);
  };

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Voice Input</h2>
          <p className="text-muted-foreground">
            {isRecording 
              ? "Recording... Speak your message" 
              : isPending 
                ? "Processing your voice message..." 
                : "Tap to start recording"}
          </p>
        </div>
        
        <div className="relative">
          <Button
            size="default"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isDisabled || isPending}
            className={`w-20 h-20 rounded-full ${isRecording ? 'animate-pulse' : ''}`}
            data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
          >
            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </Button>
          
          {isRecording && (
            <div className="absolute -inset-2 rounded-full border-2 border-destructive/30 animate-ping" />
          )}
        </div>
        
        {isPending && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span>Converting speech to text...</span>
          </div>
        )}
      </div>
    </Card>
  );
}
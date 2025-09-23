import VoiceRecorder from '../VoiceRecorder';

export default function VoiceRecorderExample() {
  const handleRecordingComplete = (audioBlob: Blob, transcript: string) => {
    console.log('Recording completed:', { audioBlob, transcript });
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
    </div>
  );
}
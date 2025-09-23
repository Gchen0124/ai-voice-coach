import VoiceInput from '../VoiceInput';

export default function VoiceInputExample() {
  return (
    <div className="p-4 max-w-md mx-auto">
      <VoiceInput 
        onVoiceMessage={(blob, transcript) => {
          console.log('Voice message received:', transcript);
        }}
      />
    </div>
  );
}
import MessageCard from '../MessageCard';

export default function MessageCardExample() {
  const handlePlay = () => {
    console.log('Play button clicked');
  };

  return (
    <div className="space-y-4 max-w-sm">
      <MessageCard
        type="user"
        title="Your Message"
        content="This is a sample voice message that demonstrates the coaching system."
        onPlay={handlePlay}
      />
      <MessageCard
        type="accent"
        title="Accent Coach"
        content="This is a sample voice message that demonstrates the coaching system."
        onPlay={handlePlay}
        accent="NYC Upper West Side"
      />
      <MessageCard
        type="language"
        title="Language Coach"
        content="This is an exemplary voice message demonstrating our advanced coaching system."
        onPlay={handlePlay}
        accent="NYC Upper West Side"
      />
      <MessageCard
        type="executive"
        title="Executive Coach"
        content="This exemplifies a professional voice communication showcasing our comprehensive coaching platform."
        onPlay={handlePlay}
        accent="NYC Upper West Side"
      />
      <MessageCard
        type="ai"
        title="AI Response"
        content="I understand you'd like to demonstrate the coaching system. This platform provides comprehensive voice training across multiple dimensions."
        onPlay={handlePlay}
      />
    </div>
  );
}
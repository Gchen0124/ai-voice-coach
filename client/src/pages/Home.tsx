import { useState } from 'react';
import CoachingSession from '@/components/CoachingSession';
import LiveConversation from '@/components/LiveConversation';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function Home() {
  const [mode, setMode] = useState<'focus' | 'live'>('focus');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-lg">Voice Coach</span>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'focus' | 'live')}>
              <TabsList>
                <TabsTrigger value="focus">Focus Mode</TabsTrigger>
                <TabsTrigger value="live">Live Mode</TabsTrigger>
              </TabsList>
            </Tabs>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="py-8">
        {mode === 'focus' ? <CoachingSession /> : <LiveConversation />}
      </main>
    </div>
  );
}
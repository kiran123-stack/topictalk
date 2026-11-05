import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { PitchDuration, PitchIdea } from './types/pitch';
import { usePitchTimer } from './features/pitch-timer/usePitchTimer';
import { UnifiedTopicTimerCard } from './features/pitch-workspace/UnifiedTopicTimerCard';
import { TopicTalkHero } from './features/idea-generation/TopicTalkHero';
import { TopicTalkLogo } from './components/TopicTalkLogo';

export default function App() {
  // Page step: 'welcome' (Arrival page matching Image 2) -> 'pitch' (Side-by-side card and clock)
  const [currentView, setCurrentView] = useState<'welcome' | 'pitch'>('welcome');

  // Topic, category, and duration configuration (1m, 3m, 5m as requested)
  const [topic, setTopic] = useState<string>('');
  const [category, setCategory] = useState<string>('Current Affairs');
  const [duration, setDuration] = useState<PitchDuration>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<string>('debate');

  // Active debate topic
  const [activePitch, setActivePitch] = useState<PitchIdea | null>(null);

  // Drift-free countdown timer
  const timer = usePitchTimer({
    initialDurationSeconds: duration * 60,
  });

  // Keep timer duration aligned when duration setting changes
  useEffect(() => {
    if (timer.status === 'idle') {
      timer.setDuration(duration * 60);
    }
  }, [duration]);

  // Handle duration selection (1m, 3m, 5m)
  const handleSelectDuration = (mins: number) => {
    const validDuration = (mins === 5 ? 5 : mins === 3 ? 3 : 1) as PitchDuration;
    setDuration(validDuration);
    timer.setDuration(validDuration * 60);
  };

  // Generate simple student topic via Gemini API / Python RAG backend
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorNotice(null);
    setCurrentView('pitch'); // Transition to practice view
    timer.reset();
    timer.setDuration(duration * 60);

    const targetTopic = topic.trim() || category;

    try {
      const response = await fetch('/api/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category,
          duration: duration,
          customTopic: targetTopic,
          seed: Date.now(),
          instructions:
            'RAG v2 Current Affairs. Simple everyday words for college students. One short, neutral debate question with multiple perspectives. Zero pros/cons boxes. Never repeat recent topics.',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.pitch) {
        setActivePitch(data.pitch);
        timer.setDuration(duration * 60);
        timer.start();
      } else {
        throw new Error(data.error || 'Failed to generate topic idea');
      }
    } catch (err: any) {
      console.warn('[TopicTalk] Backend request failed, using local fallback:', err);

      // Dynamic fallback: uses user's actual category and topic
      const fallbackQuestion = targetTopic && targetTopic !== category
        ? `What is your perspective on: ${targetTopic}?`
        : `Share your view on a current issue in ${category}. What do you think and why?`;

      setActivePitch({
        startupName: targetTopic || category,
        tagline: fallbackQuestion,
        topic: targetTopic || category,
        solution: fallbackQuestion,
        category: category,
        context: `Topic based on your selected category: ${category}. The live backend is unavailable — please check that the Python backend is running.`,
        problem: `Discuss a key challenge or decision in: ${category}`,
        targetAudience: "College students, professionals and citizens",
        features: [],
        differentiation: "",
        valueProposition: "Critical thinking and clear communication",
        businessModel: "Public policy and current affairs",
        closingStatement: "What is the strongest argument against your view?",
        pitchScript: "",
        estimatedDurationSeconds: duration * 60,
      });
      timer.setDuration(duration * 60);
      timer.start();
      setErrorNotice('Backend unavailable — using offline fallback. Start the Python backend for live RAG topics.');

    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative min-h-screen h-screen max-h-screen bg-[#FBFBFE] text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 px-3 sm:px-6 py-3 sm:py-5 overflow-hidden font-sans">
      
      {/* Soft Sky-Blue Organic Wave Accent in Bottom-Right (Matching image_fbba84a0.png) */}
      <div className="fixed -bottom-16 -right-16 w-80 h-80 sm:w-[480px] sm:h-[480px] pointer-events-none z-0">
        <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-70">
          <path d="M 80 500 C 160 330 320 220 500 180 L 500 500 Z" fill="#dbeafe" />
          <path d="M 200 500 C 260 380 370 310 500 260 L 500 500 Z" fill="#bfdbfe" opacity="0.6" />
        </svg>
      </div>

      {/* Top Header with Authentic Stencil Logo from image_faae750a.png */}
      <header className="relative z-20 w-full max-w-4xl mx-auto flex items-center justify-between py-1 sm:py-2">
        <div className="flex items-center gap-3">
          <TopicTalkLogo size="md" />
        </div>
        <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest hidden sm:block">
          Student Speaking & Debate Hub
        </div>
      </header>

      {/* VIEW 1: FIRST PAGE (Exact to image_fbba84a0.png) */}
      {currentView === 'welcome' && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center w-full animate-fade-in">
          <TopicTalkHero
            topic={topic}
            onChangeTopic={setTopic}
            selectedCategory={category}
            onChangeCategory={setCategory}
            duration={duration}
            onChangeDuration={handleSelectDuration}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            activeMode={activeMode}
            onSelectMode={setActiveMode}
          />

          {errorNotice && (
            <div className="max-w-md mx-auto mt-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-800 text-center flex items-center justify-between">
              <span className="truncate">{errorNotice}</span>
              <button
                onClick={() => setErrorNotice(null)}
                className="ml-2 text-blue-500 hover:text-blue-900 text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: UNIFIED TOPIC & TIMER CARD (Exact match to image_3d334ce4.png) */}
      {currentView === 'pitch' && (
        <div className="relative z-20 flex-1 flex flex-col justify-between items-center w-full max-w-4xl mx-auto py-2 animate-fade-in overflow-hidden">
          
          {/* Top Bar: Back to Topics Navigation */}
          <div className="w-full flex items-center justify-between gap-3 pb-3 mb-1 border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => setCurrentView('welcome')}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Topics</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-[#0075FF]">
                <Sparkles className="w-3.5 h-3.5 text-[#0075FF]" />
                <span className="truncate max-w-[240px]">{topic || category}</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#0075FF] text-white font-bold text-xs">
                {duration} MIN
              </span>
            </div>
          </div>

          {/* Unified Topic & Circular Timer Card */}
          <main className="flex-1 w-full flex items-center justify-center my-auto overflow-y-auto max-h-[82vh] custom-scrollbar p-1">
            <UnifiedTopicTimerCard
              pitch={activePitch}
              selectedDurationMinutes={duration}
              timerStatus={timer.status}
              formattedTime={timer.formattedTime}
              totalSeconds={timer.totalSeconds}
              remainingSeconds={timer.remainingSeconds}
              progressPercent={timer.progressPercent}
              onStartTimer={timer.start}
              onPauseTimer={timer.pause}
              onResumeTimer={timer.resume}
              onResetTimer={timer.reset}
              onNextTopic={handleGenerate}
              isGenerating={isGenerating}
            />
          </main>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="relative z-20 text-center py-2 text-[10px] sm:text-[11px] tracking-widest uppercase text-slate-400 font-medium">
        TOPICTALK · SIMPLE SPEAKING & DEBATES FOR STUDENTS
      </footer>

    </div>
  );
}

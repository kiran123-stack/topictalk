import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Bookmark, ArrowRight, Sparkles } from 'lucide-react';
import { PitchIdea, TimerStatus } from '../../types/pitch';

interface UnifiedTopicTimerCardProps {
  pitch: PitchIdea | null;
  selectedDurationMinutes: number;
  timerStatus: TimerStatus;
  formattedTime: string;
  totalSeconds: number;
  remainingSeconds: number;
  progressPercent: number;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onResetTimer: () => void;
  onNextTopic: () => void;
  isGenerating: boolean;
}

export const UnifiedTopicTimerCard: React.FC<UnifiedTopicTimerCardProps> = ({
  pitch,
  selectedDurationMinutes,
  timerStatus,
  formattedTime,
  progressPercent,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  onNextTopic,
  isGenerating,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const isRunning = timerStatus === 'running';
  const isPaused = timerStatus === 'paused';
  const isCompleted = timerStatus === 'completed';

  // SVG Circular progress math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, Math.max(0, progressPercent))) / 100;

  // Toggle play / pause
  const handleToggleTimer = () => {
    if (isRunning) {
      onPauseTimer();
    } else if (isPaused) {
      onResumeTimer();
    } else {
      onStartTimer();
    }
  };

  // Display simple, clear question as the central topic
  const mainTopicQuestion = pitch?.tagline || pitch?.solution || pitch?.startupName || pitch?.topic || 'Should colleges ban mobile phones inside classrooms or use them for learning?';
  const categoryTag = pitch?.category?.split('(')[0]?.trim() || pitch?.themeSuggestion || 'Current Affairs';
  const shortContext = pitch?.context || pitch?.evidenceExcerpt || '';

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 my-auto animate-fade-in">
      
      {/* 🌟 UNIFIED TOPIC & TIMER CARD (Clean, uncluttered, student-friendly) */}
      <div className="w-full bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-[0_16px_50px_rgba(0,117,255,0.07)] p-8 sm:p-12 transition-all">
        
        {isGenerating ? (
          <div className="py-14 flex flex-col items-center justify-center text-center space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0075FF] flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Finding a fresh topic…
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Picking a relatable topic for your speaking practice…
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-8 sm:gap-12">
            
            {/* LEFT COLUMN: Clean Topic Badge + Big Clear Question + Minimal Context */}
            <div className="flex-1 min-w-0 text-left w-full space-y-3">
              
              {/* Category Pill */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 text-[#0075FF] font-semibold text-xs tracking-tight">
                <span className="text-amber-500">⚡</span>
                <span>Topic</span>
                {categoryTag && (
                  <span className="text-slate-400 font-normal ml-1">· {categoryTag}</span>
                )}
              </div>

              {/* Big, Clear, Student-friendly Topic Question */}
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-slate-900 tracking-tight leading-snug mt-2 max-w-xl">
                {mainTopicQuestion}
              </h1>

              {/* Blue Accent Underline */}
              <div className="w-14 h-1.5 bg-[#0075FF] rounded-full mt-3 mb-2" />

              {/* Short 1-2 sentence real-world context note */}
              {shortContext && (
                <p className="text-xs sm:text-sm text-slate-500 font-normal max-w-lg leading-relaxed pt-1">
                  {shortContext}
                </p>
              )}

            </div>



            {/* RIGHT COLUMN: Exact Circular Progress Ring Timer (From image_3d334ce4.png) */}
            <div className="shrink-0 flex flex-col items-center justify-center my-auto">
              <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
                
                {/* Circular SVG Arc */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  {/* Active Progress Blue Stroke */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="#0075FF"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 ease-linear"
                  />
                </svg>

                {/* Center Content: Digital Countdown Time + Blue Play/Pause Circle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  {/* Time: e.g. 00:54 */}
                  <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {formattedTime}
                  </span>

                  {/* Circular Blue Pause/Play Button (Matching Image 3) */}
                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0075FF] hover:bg-[#0066ee] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,117,255,0.4)] cursor-pointer transition-transform hover:scale-105 active:scale-95"
                    title={isRunning ? 'Pause Timer' : 'Start/Resume Timer'}
                  >
                    {isRunning ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

              </div>

              {/* Status Note */}
              <span className="mt-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {isCompleted ? "Time's Up!" : isRunning ? 'Timer Running' : isPaused ? 'Paused' : 'Ready'}
              </span>
            </div>

          </div>
        )}

      </div>

      {/* 🌟 3 BOTTOM ACTION BUTTONS (Exact to image_3d334ce4.png: Reset Circle, Next Topic Blue Pill, Bookmark Circle) */}
      <div className="flex items-center justify-center gap-4 sm:gap-5">
        
        {/* 1. Left: Circular Reset/Reload Button */}
        <button
          type="button"
          onClick={onResetTimer}
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Reset Clock"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* 2. Middle: Next Topic Blue Pill CTA Button */}
        <button
          type="button"
          onClick={onNextTopic}
          disabled={isGenerating}
          className="rounded-full bg-gradient-to-r from-[#0080ff] to-[#0066ee] hover:brightness-105 text-white font-semibold text-sm sm:text-base px-7 sm:px-9 py-3.5 shadow-[0_6px_20px_rgba(0,117,255,0.35)] hover:shadow-[0_8px_25px_rgba(0,117,255,0.45)] flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <span>Next Topic</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* 3. Right: Circular Bookmark/Save Button */}
        <button
          type="button"
          onClick={() => setIsBookmarked(!isBookmarked)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95 ${
            isBookmarked
              ? 'bg-blue-50 text-[#0075FF] border border-blue-200'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title={isBookmarked ? 'Topic Saved' : 'Save/Bookmark Topic'}
        >
          <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>

      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { Lightbulb, Layers, ChevronDown, Check, ArrowRight, Mic, MessageSquare, Users, BarChart2 } from 'lucide-react';
import { PitchDuration } from '../../types/pitch';

interface TopicTalkHeroProps {
  topic: string;
  onChangeTopic: (val: string) => void;
  selectedCategory: string;
  onChangeCategory: (cat: string) => void;
  duration: PitchDuration;
  onChangeDuration: (dur: PitchDuration) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  activeMode?: string;
  onSelectMode?: (mode: string) => void;
}

const CATEGORIES = [
  'Latest News & Current Affairs',
  'State Gov & Tamil Nadu',
  'Central Government Schemes',
  'Jobs, Economy & Technology',
  'Education, Colleges & Exams',
  'Technology, AI & Digital Life',
  'Entertainment, Cinema & OTT',
  'Environment, Climate & Cities',
  'International Affairs',
];


const MODES = [
  { id: 'pitch', label: 'Pitch Practice', icon: Mic },
  { id: 'debate', label: 'Debate Mode', icon: MessageSquare },
  { id: 'interview', label: 'Mock Interview', icon: Users },
  { id: 'progress', label: 'My Progress', icon: BarChart2 },
];

export const TopicTalkHero: React.FC<TopicTalkHeroProps> = ({
  topic,
  onChangeTopic,
  selectedCategory,
  onChangeCategory,
  duration,
  onChangeDuration,
  onGenerate,
  isGenerating,
  activeMode = 'debate',
  onSelectMode,
}) => {
  const [isOpenCategories, setIsOpenCategories] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-between min-h-[540px] px-4 py-8 z-20">
      
      {/* Top / Main Interactive Generation Center (Matching image_fbba84a0.png) */}
      <div className="w-full flex flex-col items-center justify-center my-auto space-y-7">
        
        {/* 1. Center Pill Search Bar */}
        <div className="w-full max-w-3xl relative">
          <div className="w-full flex items-center bg-white rounded-full border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.09)] transition-all px-4 sm:px-6 py-2.5 sm:py-3 gap-3">
            
            {/* Blue Lightbulb Icon */}
            <div className="shrink-0 flex items-center justify-center text-[#0075FF]">
              <Lightbulb className="w-6 h-6 stroke-[2]" />
            </div>

            {/* Topic Input Field */}
            <input
              type="text"
              value={topic}
              onChange={(e) => onChangeTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a topic or click Generate..."
              className="flex-1 bg-transparent text-sm sm:text-base text-slate-800 placeholder:text-slate-400 font-normal focus:outline-none min-w-0"
            />

            {/* Subtle Vertical Divider */}
            <div className="h-6 w-px bg-slate-200 shrink-0 mx-1 hidden sm:block" />

            {/* Category Dropdown Pill */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsOpenCategories(!isOpenCategories)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs sm:text-sm font-medium text-slate-800 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#0075FF]" />
                <span className="truncate max-w-[140px]">{selectedCategory || 'Current Affairs'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Categories Menu */}
              {isOpenCategories && (
                <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-left animate-fade-in">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                    Select Topic Category
                  </div>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        onChangeCategory(cat);
                        setIsOpenCategories(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all text-left cursor-pointer"
                    >
                      <span>{cat}</span>
                      {selectedCategory === cat && <Check className="w-4 h-4 text-[#0075FF]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 2. "Speaking Time" Label & 3 Pill Buttons */}
        <div className="flex flex-col items-center space-y-2.5">
          <span className="text-xs sm:text-sm font-medium text-slate-700 tracking-normal">
            Speaking Time
          </span>
          <div className="flex items-center gap-2.5 sm:gap-3">
            {[1, 3, 5].map((mins) => {
              const isSelected = duration === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeDuration(mins as PitchDuration)}
                  className={`min-w-[76px] sm:min-w-[88px] px-5 py-2 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0075FF] text-white font-medium shadow-[0_4px_14px_rgba(0,117,255,0.35)] scale-105'
                      : 'bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 font-normal'
                  }`}
                >
                  {mins} min
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Big Blue CTA Button: "Generate Topic & Start ->" */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-full bg-[#0075FF] hover:bg-[#0066ee] text-white font-semibold text-sm sm:text-base px-8 sm:px-11 py-3.5 shadow-[0_8px_25px_rgba(0,117,255,0.35)] hover:shadow-[0_10px_30px_rgba(0,117,255,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-2.5 cursor-pointer disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Finding your best idea…</span>
            </>
          ) : (
            <>
              <span>Generate Topic & Start</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
        </button>

      </div>

      {/* 4. Bottom Row of 4 Mode Columns with Vertical Dividers (Exact to image_fbba84a0.png) */}
      <div className="w-full max-w-3xl pt-8 border-t border-slate-100 flex items-center justify-between mt-auto">
        {MODES.map((mode, idx) => {
          const Icon = mode.icon;
          const isSelected = activeMode === mode.id;
          return (
            <React.Fragment key={mode.id}>
              <button
                type="button"
                onClick={() => onSelectMode?.(mode.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-2 py-2 px-1 text-center cursor-pointer transition-all group ${
                  isSelected ? 'text-[#0075FF]' : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110 ${
                  isSelected ? 'text-[#0075FF] stroke-[2.2]' : 'text-slate-700 stroke-[1.8]'
                }`} />
                <span className={`text-xs sm:text-sm font-medium tracking-tight ${
                  isSelected ? 'font-semibold text-[#0075FF]' : 'text-slate-800'
                }`}>
                  {mode.label}
                </span>
              </button>

              {/* Subtle vertical divider between columns (except after last column) */}
              {idx < MODES.length - 1 && (
                <div className="h-7 w-px bg-slate-200/90 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

    </div>
  );
};

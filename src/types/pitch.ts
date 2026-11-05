export type ThemeKey =
  | 'science-tech'
  | 'science-fiction'
  | 'relationships'
  | 'marriage'
  | 'healthcare'
  | 'education'
  | 'finance'
  | 'environment'
  | 'social-impact'
  | 'custom';

export type PitchDuration = 1 | 3 | 5 | 15;

export interface PitchConfig {
  theme: ThemeKey;
  duration: PitchDuration;
  customTopic: string;
  instructions: string;
}

export interface AIMetadata {
  isLiveAI: boolean;
  model: string;
  generatedAt: string;
  generationLatencyMs?: number;
  promptTopic?: string;
  uniquenessMoat?: string;
}

export interface PitchIdea {
  startupName: string;
  tagline: string;
  problem: string;
  targetAudience: string;
  solution: string;
  features: string[];
  valueProposition: string;
  businessModel: string;
  differentiation: string;
  closingStatement: string;
  pitchScript: string;
  estimatedDurationSeconds: number;
  themeSuggestion?: string;
  aiMetadata?: AIMetadata;

  // Speaking & Critical Thinking RAG fields
  topic?: string;
  category?: string;
  difficulty?: string;
  context?: string;
  groundedSection?: string;
  sourceDocument?: string;
  evidenceExcerpt?: string;
  supportingArguments?: string[];
  opposingArguments?: string[];
  criticalThinkingQuestions?: string[];
  realWorldConnection?: string;
  speakingChallenge?: string;
  authoritativeSources?: string[];
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface ThemeDefinition {
  id: ThemeKey;
  name: string;
  subtitle: string;
  badge: string;
  gradient: string;
  orbPrimary: string;
  orbSecondary: string;
  orbAccent: string;
  cardBg: string;
  cardBorder: string;
  cardGlow: string;
  accentText: string;
  accentButton: string;
  pillBorder: string;
}

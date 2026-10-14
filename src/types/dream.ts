export type LucidityLevel = 'non-lucid' | 'lucid' | 'uncertain';

export type RecallQuality = 'hazy' | 'fragmentary' | 'detailed' | 'crystal';

export interface DreamScene {
  id: string;
  sceneNumber: number;
  title?: string;
  narrative: string;
  falseAwakening?: boolean;
  lucid?: boolean;
}

export interface FalseAwakeningDetails {
  believedAwake: boolean;
  environmentDescription?: string;
  triggerOrAnomaly?: string;
  realityCheckNotes?: string;
}

export interface DreamEntry {
  id: string;
  title: string;
  narrative: string;
  date: string; // YYYY-MM-DD
  wakeUpTime?: string; // HH:mm
  vividness: number; // 1 to 5
  recallQuality: RecallQuality;
  lucidity: LucidityLevel;
  emotions: string[];
  tags: string[];
  dreamSignsNotes?: string;

  // Phase 2 Enhanced Intelligence Fields
  scenesCount?: number;
  dreamControl?: number; // 1 to 5
  lucidityConfidence?: number; // 1 to 5
  falseAwakening?: boolean;
  falseAwakeningDetails?: FalseAwakeningDetails;
  realityChecksUseful?: string[];
  interpretationNotes?: string;
  scenes?: DreamScene[];

  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type DreamDraft = Omit<DreamEntry, 'id' | 'createdAt' | 'updatedAt'>;

export const PREDEFINED_EMOTIONS = [
  'Wonder',
  'Joy',
  'Euphoria',
  'Serenity',
  'Curiosity',
  'Awe',
  'Confusion',
  'Mystery',
  'Nostalgia',
  'Anxiety',
  'Fear',
  'Relief',
  'Adventure',
  'Love',
] as const;

export const DEFAULT_TAGS = [
  'Flying',
  'Lucid Induction',
  'Nightmare',
  'Space',
  'Ocean',
  'Recurring Theme',
  'False Awakening',
  'Sleep Paralysis',
  'Childhood',
  'Astral',
] as const;

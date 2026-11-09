export type LucidityLevel = 'non-lucid' | 'lucid' | 'uncertain';

export type RecallQuality = 'hazy' | 'fragmentary' | 'detailed' | 'crystal';

export type InductionTechnique =
  | 'none'
  | 'MILD'
  | 'WILD'
  | 'SSILD'
  | 'WBTB'
  | 'ADA'
  | 'Reality Checks'
  | 'FILD'
  | 'DEILD'
  | 'CANWILD'
  | 'SATS'
  | 'Intention Setting'
  | 'Other'
  | string;

export interface InductionTechniqueOption {
  value: string;
  label: string;
  shortLabel: string;
  description?: string;
}

export const INDUCTION_TECHNIQUE_OPTIONS: InductionTechniqueOption[] = [
  { value: 'none', label: 'No Technique (Natural)', shortLabel: 'None', description: 'Spontaneous dream without active induction' },
  { value: 'MILD', label: 'MILD (Mnemonic Induction)', shortLabel: 'MILD', description: 'Prospective memory affirmation & visualization' },
  { value: 'WILD', label: 'WILD (Wake-Initiated)', shortLabel: 'WILD', description: 'Conscious direct entry from waking into REM' },
  { value: 'SSILD', label: 'SSILD (Senses Initiated)', shortLabel: 'SSILD', description: 'Cyclical sensory scans (Sight, Sound, Touch)' },
  { value: 'WBTB', label: 'WBTB (Wake-Back-To-Bed)', shortLabel: 'WBTB', description: 'Brief nocturnal awakening during peak REM' },
  { value: 'ADA', label: 'ADA (All Day Awareness)', shortLabel: 'ADA', description: 'Continuous mindfulness & acute daytime presence' },
  { value: 'Reality Checks', label: 'Questioning Reality / Reality Checks', shortLabel: 'Reality Checks', description: 'Metacognitive checks & critical state testing' },
  { value: 'FILD', label: 'FILD (Finger-Induced)', shortLabel: 'FILD', description: 'Sub-threshold finger micro-movements into sleep' },
  { value: 'DEILD', label: 'DEILD (Dream Exit Induced)', shortLabel: 'DEILD', description: 'Dream chaining by holding still upon waking' },
  { value: 'CANWILD', label: 'CANWILD (Custom Alarm)', shortLabel: 'CANWILD', description: 'Auto-shutoff audio alarm with zero movement' },
  { value: 'SATS', label: 'SATS (State Akin To Sleep)', shortLabel: 'SATS', description: 'Hypnagogic drowsy sensory looping' },
  { value: 'Intention Setting', label: 'Intention Setting', shortLabel: 'Intention', description: 'Subconscious priming before sleep' },
  { value: 'Other', label: 'Other (Custom Technique)', shortLabel: 'Other', description: 'Specify a custom or experimental protocol' },
];

export function formatTechniqueDisplayName(technique?: string, customName?: string): string {
  if (!technique || technique === 'none') return 'None (Natural)';
  if (technique === 'Other') return customName?.trim() || 'Other (Custom)';
  const match = INDUCTION_TECHNIQUE_OPTIONS.find((t) => t.value === technique);
  return match ? match.label : technique;
}

export function formatTechniqueShortName(technique?: string, customName?: string): string {
  if (!technique || technique === 'none') return 'None';
  if (technique === 'Other') return customName?.trim() || 'Other';
  const match = INDUCTION_TECHNIQUE_OPTIONS.find((t) => t.value === technique);
  return match ? match.shortLabel : technique;
}

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

  // Induction Technique tracking
  techniqueUsed?: string;
  customTechniqueUsed?: string;

  // Phase 2 Enhanced Intelligence Fields
  scenesCount?: number;
  dreamControl?: number; // 1 to 5
  lucidityConfidence?: number; // 1 to 5
  falseAwakening?: boolean;
  falseAwakeningDetails?: FalseAwakeningDetails;
  realityChecksUseful?: string[];
  interpretationNotes?: string;
  scenes?: DreamScene[];
  relatedDreamIds?: string[];
  isFavorite?: boolean;

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

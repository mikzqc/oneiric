import { DreamSignCategory, DreamSignStatus } from './dreamSign';
import { LucidityLevel } from './dream';

export type CorrelationTimeRange = '30d' | '90d' | '1y' | 'all';
export type ConfidenceRating = 'high' | 'moderate' | 'low';

export interface CorrelationFilter {
  timeRange: CorrelationTimeRange;
  lucidityFilter: 'all' | LucidityLevel;
  signStatus: 'all_active' | 'confirmed_only';
  minOccurrences: number; // default: 2
  category?: DreamSignCategory | 'all';
}

export interface SignLucidityCorrelation {
  signId: string;
  signName: string;
  category: DreamSignCategory;
  status: DreamSignStatus;
  totalOccurrences: number; // Distinct dreams with this sign
  lucidOccurrences: number; // Distinct dreams with this sign that are lucid
  nonLucidOccurrences: number;
  uncertainOccurrences: number;
  signLucidityRate: number; // % (0-100)
  baselineLucidityRate: number; // % (0-100) across all dreams in period
  rateDifference: number; // percentage points (e.g., +25.5)
  relativeRisk: number | null; // signLucidityRate / nonSignLucidityRate
  matchedDreamIds: string[];
  confidence: ConfidenceRating; // high (n >= 5), moderate (3 <= n < 5), low (n < 3)
}

export interface SignVividnessCorrelation {
  signId: string;
  signName: string;
  category: DreamSignCategory;
  status: DreamSignStatus;
  sampleSize: number; // Dreams with sign having valid vividness
  avgVividnessWithSign: number; // 1-5 scale
  avgVividnessWithoutSign: number; // 1-5 scale
  vividnessDifference: number; // signed difference
  matchedDreamIds: string[];
  confidence: ConfidenceRating;
}

export interface EmotionLucidityCorrelation {
  emotion: string;
  totalOccurrences: number; // Distinct dreams with this emotion
  lucidOccurrences: number;
  emotionLucidityRate: number; // % (0-100)
  baselineLucidityRate: number; // % (0-100)
  rateDifference: number; // percentage points
  matchedDreamIds: string[];
  confidence: ConfidenceRating;
}

export interface FalseAwakeningSignCorrelation {
  signId: string;
  signName: string;
  category: DreamSignCategory;
  status: DreamSignStatus;
  signOccurrencesInFA: number; // FA dreams containing this sign
  totalFADreams: number; // Total FA dreams in period
  faRateWithSign: number; // % of dreams with this sign that are FAs
  baselineFARate: number; // % of all dreams that are FAs
  rateDifference: number; // percentage points
  matchedDreamIds: string[];
  confidence: ConfidenceRating;
}

export interface SceneComplexityCorrelation {
  totalAnalyzedDreams: number; // Dreams with recorded scenes count
  singleSceneCount: number;
  multiSceneCount: number;
  singleSceneAvgVividness: number | null;
  multiSceneAvgVividness: number | null;
  singleSceneAvgControl: number | null;
  multiSceneAvgControl: number | null;
  vividnessDifference: number | null;
  controlDifference: number | null;
  singleSceneDreamIds: string[];
  multiSceneDreamIds: string[];
}

export interface TechniqueOutcomeCorrelation {
  technique: string;
  sampleSize: number; // Nights logged
  recallCount: number; // dream_recalled or lucid_dream
  recallRate: number; // %
  lucidCount: number;
  lucidRate: number; // %
  avgConfidence: number | null;
  hasSufficientData: boolean; // sampleSize >= 3
}

export interface CorrelationReport {
  totalDreamsAnalyzed: number;
  totalLucidDreams: number;
  baselineLucidityRate: number; // %
  totalFalseAwakenings: number;
  baselineFARate: number; // %
  averageVividness: number;
  activeSignsCount: number;
  filter: CorrelationFilter;

  // Domain associations
  signLucidityCorrelations: SignLucidityCorrelation[];
  signVividnessCorrelations: SignVividnessCorrelation[];
  emotionLucidityCorrelations: EmotionLucidityCorrelation[];
  faSignCorrelations: FalseAwakeningSignCorrelation[];
  sceneComplexity: SceneComplexityCorrelation;
  techniqueOutcomes: TechniqueOutcomeCorrelation[];

  // Counts of statistically notable findings
  notableFindingsCount: number;
}

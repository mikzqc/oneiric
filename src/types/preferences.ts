import { LucidityLevel, RecallQuality } from './dream';

export type CardDensity = 'compact' | 'comfortable' | 'expanded';
export type NarrativeFontFamily = 'sans' | 'serif' | 'mono';
export type NarrativeFontSize = 'sm' | 'base' | 'lg' | 'xl';
export type DateFormatOption = 'standard' | 'iso' | 'european' | 'relative';
export type TimeFormatOption = '12h' | '24h';
export type DefaultLucidityOption = LucidityLevel | 'last-used';
export type DefaultRecallOption = RecallQuality;
export type DefaultTechniqueOption =
  | 'none'
  | 'MILD'
  | 'WILD'
  | 'SSILD'
  | 'WBTB'
  | 'ADA'
  | 'Reality Checks'
  | 'last-used';

export type AutoTrashPurgeDays = 7 | 30 | 60 | 0; // 0 = never purge automatically

export interface UserPreferences {
  // Journaling & Editor Defaults
  defaultLucidity: DefaultLucidityOption;
  defaultRecallQuality: DefaultRecallOption;
  defaultTechnique: DefaultTechniqueOption;
  lastUsedLucidity?: LucidityLevel;
  lastUsedTechnique?: string;
  autoExpandAdvancedFields: boolean;
  showWordCounter: boolean;

  // Display & Typography
  cardDensity: CardDensity;
  narrativeFontFamily: NarrativeFontFamily;
  narrativeFontSize: NarrativeFontSize;
  dateFormat: DateFormatOption;
  timeFormat: TimeFormatOption;

  // Analytics & Retention
  defaultAnalyticsWindow: '1w' | '2w' | '1m' | 'all';
  autoPurgeTrashDays: AutoTrashPurgeDays;
  confirmBeforeDelete: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultLucidity: 'non-lucid',
  defaultRecallQuality: 'detailed',
  defaultTechnique: 'none',
  autoExpandAdvancedFields: false,
  showWordCounter: true,

  cardDensity: 'comfortable',
  narrativeFontFamily: 'sans',
  narrativeFontSize: 'base',
  dateFormat: 'standard',
  timeFormat: '12h',

  defaultAnalyticsWindow: '1w',
  autoPurgeTrashDays: 30,
  confirmBeforeDelete: true,
};

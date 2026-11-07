import {
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
} from '../types/preferences';
import { LucidityLevel } from '../types/dream';

export const PREFERENCES_STORAGE_KEY = 'oneiric_user_preferences';
export const PREFERENCES_CHANGED_EVENT = 'oneiric:preferences-changed';

export const preferencesService = {
  getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_USER_PREFERENCES,
            ...parsed,
          };
        }
      }
    } catch {
      // ignore storage access error
    }
    return { ...DEFAULT_USER_PREFERENCES };
  },

  updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences();
    const updated: UserPreferences = {
      ...current,
      ...partial,
    };

    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage write error
    }

    this.applyPreferences(updated);

    window.dispatchEvent(
      new CustomEvent<UserPreferences>(PREFERENCES_CHANGED_EVENT, { detail: updated })
    );

    return updated;
  },

  resetPreferences(): UserPreferences {
    try {
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    } catch {
      // ignore
    }
    const defaults = { ...DEFAULT_USER_PREFERENCES };
    this.applyPreferences(defaults);
    window.dispatchEvent(
      new CustomEvent<UserPreferences>(PREFERENCES_CHANGED_EVENT, { detail: defaults })
    );
    return defaults;
  },

  applyPreferences(prefs?: UserPreferences): void {
    if (typeof document === 'undefined') return;

    const currentPrefs = prefs ?? preferencesService.getPreferences();
    const root = document.documentElement;

    // Apply Narrative Font Family
    const fontFamilies: Record<string, string> = {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    };
    root.style.setProperty('--font-narrative', fontFamilies[currentPrefs.narrativeFontFamily] || fontFamilies.sans);

    // Apply Narrative Font Size
    const fontSizes: Record<string, string> = {
      sm: '0.8125rem', // 13px
      base: '0.9375rem', // 15px
      lg: '1.0625rem', // 17px
      xl: '1.1875rem', // 19px
    };
    root.style.setProperty('--font-size-narrative', fontSizes[currentPrefs.narrativeFontSize] || fontSizes.base);

    // Apply Motion Preference & Reduced Motion Class
    const shouldReduceMotion =
      currentPrefs.motionPreference === 'reduced' ||
      (currentPrefs.motionPreference === 'auto' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

    if (shouldReduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  },

  init(): void {
    this.applyPreferences();
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      media.addEventListener('change', () => {
        const prefs = this.getPreferences();
        if (prefs.motionPreference === 'auto') {
          this.applyPreferences(prefs);
        }
      });
    }
  },

  recordLastUsedLucidity(lucidity: LucidityLevel): void {
    this.updatePreferences({ lastUsedLucidity: lucidity });
  },

  recordLastUsedTechnique(technique?: string): void {
    if (technique) {
      this.updatePreferences({ lastUsedTechnique: technique });
    }
  },

  getEffectiveNewDreamLucidity(): LucidityLevel {
    const prefs = this.getPreferences();
    if (prefs.defaultLucidity === 'last-used') {
      return prefs.lastUsedLucidity || 'non-lucid';
    }
    return prefs.defaultLucidity;
  },

  getEffectiveNewDreamTechnique(): string {
    const prefs = this.getPreferences();
    if (prefs.defaultTechnique === 'last-used') {
      return prefs.lastUsedTechnique || 'none';
    }
    return prefs.defaultTechnique;
  },
};

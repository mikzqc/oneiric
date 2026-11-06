import { DEFAULT_THEME_ID, THEMES_CATALOG, ThemeConfig, ThemeId } from '../types/theme';

export const THEME_STORAGE_KEY = 'oneiric_selected_theme';
export const THEME_CHANGED_EVENT = 'oneiric:theme-changed';

export const themeService = {
  /**
   * Retrieves the currently active theme ID from localStorage (or defaults to midnight)
   */
  getCurrentThemeId(): ThemeId {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (stored && THEMES_CATALOG.some((t) => t.id === stored)) {
        return stored;
      }
    } catch {
      // ignore storage access errors
    }
    return DEFAULT_THEME_ID;
  },

  /**
   * Retrieves the full ThemeConfig object for the current theme
   */
  getCurrentTheme(): ThemeConfig {
    const id = this.getCurrentThemeId();
    return THEMES_CATALOG.find((t) => t.id === id) || THEMES_CATALOG[0];
  },

  /**
   * Applies the theme to the document and persists it to localStorage
   */
  setTheme(themeId: ThemeId): void {
    const config = THEMES_CATALOG.find((t) => t.id === themeId);
    if (!config) return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // ignore storage errors
    }

    this.applyTheme(themeId);

    window.dispatchEvent(
      new CustomEvent<ThemeConfig>(THEME_CHANGED_EVENT, { detail: config })
    );
  },

  /**
   * Applies CSS variables and data-theme attribute on document.documentElement
   */
  applyTheme(themeId: ThemeId): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const config = THEMES_CATALOG.find((t) => t.id === themeId) || THEMES_CATALOG[0];

    // Set data-theme attribute for targeted CSS selectors
    root.setAttribute('data-theme', themeId);

    // Apply exact CSS variables directly to root style to ensure immediate 100% cascade
    const { palette } = config;
    root.style.setProperty('--bg-base', palette.bgBase);
    root.style.setProperty('--bg-surface', palette.bgSurface);
    root.style.setProperty('--bg-surface-raised', palette.bgSurfaceRaised);
    root.style.setProperty('--border-subtle', palette.borderSubtle);
    root.style.setProperty('--border-strong', palette.borderStrong);
    root.style.setProperty('--accent-primary', palette.accentPrimary);
    root.style.setProperty('--accent-primary-hover', palette.accentHover);
    root.style.setProperty('--text-primary', palette.textPrimary);
    root.style.setProperty('--text-secondary', palette.textSecondary);
  },

  /**
   * Initializes the theme on initial app startup
   */
  initTheme(): void {
    const current = this.getCurrentThemeId();
    this.applyTheme(current);
  },
};

import React, { useState, useEffect } from 'react';
import { THEMES_CATALOG, ThemeCategory, ThemeConfig, ThemeId } from '../../types/theme';
import { themeService, THEME_CHANGED_EVENT } from '../../services/themeService';
import { Palette, Check } from 'lucide-react';

interface ThemeSelectorCardProps {
  onFeedback?: (type: 'success' | 'error', message: string) => void;
}

export const ThemeSelectorCard: React.FC<ThemeSelectorCardProps> = ({ onFeedback }) => {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(() => themeService.getCurrentThemeId());
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<ThemeConfig>;
      if (custom.detail?.id) {
        setActiveThemeId(custom.detail.id);
      }
    };

    window.addEventListener(THEME_CHANGED_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, handleThemeChange);
  }, []);

  const handleSelectTheme = (theme: ThemeConfig) => {
    if (theme.id === activeThemeId) return;
    themeService.setTheme(theme.id);
    setActiveThemeId(theme.id);
    if (onFeedback) {
      onFeedback('success', `Theme switched to "${theme.name}".`);
    }
  };

  const filteredThemes = THEMES_CATALOG.filter((theme) => {
    if (selectedCategory === 'all') return true;
    return theme.category === selectedCategory;
  });

  const activeTheme = THEMES_CATALOG.find((t) => t.id === activeThemeId) || THEMES_CATALOG[0];

  return (
    <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <Palette className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Color Theme & Visual Atmosphere</h2>
            <p className="text-xs text-slate-400">
              Personalize your journal workbench across 15 curated high-contrast nocturnal palettes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-md border flex items-center gap-1.5"
            style={{
              backgroundColor: activeTheme.palette.bgSurfaceRaised,
              borderColor: activeTheme.palette.borderSubtle,
              color: activeTheme.palette.textPrimary,
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeTheme.palette.accentPrimary }}
            />
            <span className="font-semibold">{activeTheme.name}</span>
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-blue-950 border-blue-500 text-blue-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          All Themes (15)
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('nocturnal')}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            selectedCategory === 'nocturnal'
              ? 'bg-blue-950 border-blue-500 text-blue-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          Nocturnal & Analytical (6)
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('cosmic')}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            selectedCategory === 'cosmic'
              ? 'bg-blue-950 border-blue-500 text-blue-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          Cosmic & Luminous (5)
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('earthy')}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            selectedCategory === 'earthy'
              ? 'bg-blue-950 border-blue-500 text-blue-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          Earthy & Organic (4)
        </button>
      </div>

      {/* Themes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredThemes.map((theme) => {
          const isSelected = theme.id === activeThemeId;
          const { palette } = theme;

          return (
            <div
              key={theme.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectTheme(theme)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectTheme(theme);
                }
              }}
              className={`group relative p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-blue-500 shadow-md'
                  : 'hover:border-slate-600'
              }`}
              style={{
                backgroundColor: isSelected ? palette.bgSurface : 'rgba(15, 23, 42, 0.4)',
                borderColor: isSelected ? palette.accentPrimary : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="space-y-2">
                {/* Title & Active Badge */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                    {theme.name}
                  </h3>
                  {isSelected && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm"
                      style={{
                        backgroundColor: palette.accentPrimary,
                        color: '#ffffff',
                      }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-snug">
                  {theme.description}
                </p>
              </div>

              {/* Palette Color Swatches Preview */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Palette Swatch</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    {theme.category}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 h-6 rounded-lg overflow-hidden p-0.5 bg-black/40 border border-slate-800">
                  {/* Swatch 1: Base */}
                  <div
                    className="h-full rounded-sm"
                    style={{ backgroundColor: palette.bgBase }}
                    title={`Base Background: ${palette.bgBase}`}
                  />
                  {/* Swatch 2: Surface */}
                  <div
                    className="h-full rounded-sm"
                    style={{ backgroundColor: palette.bgSurface }}
                    title={`Surface: ${palette.bgSurface}`}
                  />
                  {/* Swatch 3: Border / Elevated */}
                  <div
                    className="h-full rounded-sm"
                    style={{ backgroundColor: palette.borderSubtle }}
                    title={`Border: ${palette.borderSubtle}`}
                  />
                  {/* Swatch 4: Accent */}
                  <div
                    className="h-full rounded-sm"
                    style={{ backgroundColor: palette.accentPrimary }}
                    title={`Accent: ${palette.accentPrimary}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

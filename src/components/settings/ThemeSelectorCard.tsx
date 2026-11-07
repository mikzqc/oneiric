import React, { useState, useEffect, useRef } from 'react';
import { THEMES_CATALOG, ThemeCategory, ThemeConfig, ThemeId } from '../../types/theme';
import { themeService, THEME_CHANGED_EVENT } from '../../services/themeService';
import { Palette, Check, ChevronDown } from 'lucide-react';

interface ThemeSelectorCardProps {
  onFeedback?: (type: 'success' | 'error', message: string) => void;
}

export const ThemeSelectorCard: React.FC<ThemeSelectorCardProps> = ({ onFeedback }) => {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(() => themeService.getCurrentThemeId());
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = (theme: ThemeConfig) => {
    if (theme.id !== activeThemeId) {
      themeService.setTheme(theme.id);
      setActiveThemeId(theme.id);
      if (onFeedback) {
        onFeedback('success', `Theme switched to "${theme.name}".`);
      }
    }
    setIsOpen(false);
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

      {/* Theme Dropdown Selector */}
      <div className="relative" ref={dropdownRef}>
        <label className="text-xs font-semibold text-slate-200 block mb-2">
          Select Active Theme
        </label>

        {/* Dropdown Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Select theme dropdown"
          className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all duration-150 cursor-pointer shadow-sm text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Palette swatch preview */}
            <div className="flex items-center gap-1 h-5 px-1.5 rounded bg-black/40 border border-slate-800 shrink-0">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: activeTheme.palette.bgBase }} title="Base" />
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: activeTheme.palette.bgSurface }} title="Surface" />
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: activeTheme.palette.borderSubtle }} title="Border" />
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: activeTheme.palette.accentPrimary }} title="Accent" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100 truncate">
                  {activeTheme.name}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {activeTheme.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {activeTheme.description}
              </p>
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu Popup */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 right-0 mt-2 z-50 p-2.5 rounded-xl bg-[#0f172a] border border-slate-700 shadow-2xl space-y-2 animate-dropdown"
          >
            {/* Category Filter Pills inside dropdown */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 border-b border-slate-800 pb-2">
              {[
                { id: 'all' as ThemeCategory, label: 'All Themes (15)' },
                { id: 'nocturnal' as ThemeCategory, label: 'Nocturnal & Analytical (6)' },
                { id: 'cosmic' as ThemeCategory, label: 'Cosmic & Luminous (5)' },
                { id: 'earthy' as ThemeCategory, label: 'Earthy & Organic (4)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-950 border-blue-500 text-blue-200 shadow-xs'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scrollable List of Themes */}
            <div className="max-h-80 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredThemes.map((theme) => {
                const isSelected = theme.id === activeThemeId;
                const { palette } = theme;

                return (
                  <div
                    key={theme.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectTheme(theme)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-150 cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 text-slate-100 shadow-xs'
                        : 'bg-slate-900/50 border-transparent hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Swatch */}
                      <div className="flex items-center gap-1 h-5 px-1.5 rounded bg-black/40 border border-slate-800 shrink-0">
                        <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: palette.bgBase }} />
                        <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: palette.bgSurface }} />
                        <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: palette.borderSubtle }} />
                        <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: palette.accentPrimary }} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-100 truncate">
                            {theme.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {theme.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-sm">
                          {theme.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60 shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Theme Summary Strip */}
      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Current Palette Specs
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {activeTheme.name} — {activeTheme.description}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0 self-start sm:self-auto">
            Category: {activeTheme.category}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center gap-2">
            <span className="w-4 h-4 rounded shrink-0 border border-white/10" style={{ backgroundColor: activeTheme.palette.bgBase }} />
            <div>
              <span className="text-[9px] text-slate-500 block font-sans">Base BG</span>
              <span className="text-slate-300 text-[11px]">{activeTheme.palette.bgBase}</span>
            </div>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center gap-2">
            <span className="w-4 h-4 rounded shrink-0 border border-white/10" style={{ backgroundColor: activeTheme.palette.bgSurface }} />
            <div>
              <span className="text-[9px] text-slate-500 block font-sans">Surface</span>
              <span className="text-slate-300 text-[11px]">{activeTheme.palette.bgSurface}</span>
            </div>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center gap-2">
            <span className="w-4 h-4 rounded shrink-0 border border-white/10" style={{ backgroundColor: activeTheme.palette.borderSubtle }} />
            <div>
              <span className="text-[9px] text-slate-500 block font-sans">Subtle Border</span>
              <span className="text-slate-300 text-[11px]">{activeTheme.palette.borderSubtle}</span>
            </div>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center gap-2">
            <span className="w-4 h-4 rounded shrink-0 border border-white/10" style={{ backgroundColor: activeTheme.palette.accentPrimary }} />
            <div>
              <span className="text-[9px] text-slate-500 block font-sans">Accent</span>
              <span className="text-blue-400 font-semibold text-[11px]">{activeTheme.palette.accentPrimary}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

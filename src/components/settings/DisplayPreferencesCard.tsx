import React, { useState, useEffect } from 'react';
import { Sliders, Type, LayoutGrid, Clock, Calendar } from 'lucide-react';
import {
  preferencesService,
  PREFERENCES_CHANGED_EVENT,
} from '../../services/preferencesService';
import {
  CardDensity,
  DateFormatOption,
  NarrativeFontFamily,
  NarrativeFontSize,
  UserPreferences,
} from '../../types/preferences';

interface DisplayPreferencesCardProps {
  onFeedback?: (type: 'success' | 'error', message: string) => void;
}

export const DisplayPreferencesCard: React.FC<DisplayPreferencesCardProps> = ({ onFeedback }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(() => preferencesService.getPreferences());

  useEffect(() => {
    const handlePrefsChange = (e: Event) => {
      const custom = e as CustomEvent<UserPreferences>;
      if (custom.detail) {
        setPrefs(custom.detail);
      }
    };
    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
  }, []);

  const update = (partial: Partial<UserPreferences>, label: string) => {
    const updated = preferencesService.updatePreferences(partial);
    setPrefs(updated);
    if (onFeedback) {
      onFeedback('success', `${label} updated.`);
    }
  };

  return (
    <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
        <Sliders className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-100">Typography, Layout & Date Preferences</h2>
          <p className="text-xs text-slate-400">
            Tune reading typography, feed information density, and chronological formatting
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Typography */}
        <div className="space-y-4">
          {/* Narrative Font Family */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-blue-400" />
                <span>Narrative Font Family</span>
              </label>
              <span className="text-[11px] text-slate-400 capitalize">
                {prefs.narrativeFontFamily === 'sans'
                  ? 'Modern Sans-Serif'
                  : prefs.narrativeFontFamily === 'serif'
                  ? 'Editorial Book Serif'
                  : 'Analytical Monospace'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'sans' as NarrativeFontFamily, label: 'Modern Sans', preview: 'Aa' },
                { id: 'serif' as NarrativeFontFamily, label: 'Book Serif', preview: 'Gg' },
                { id: 'mono' as NarrativeFontFamily, label: 'Terminal Mono', preview: '01' },
              ].map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => update({ narrativeFontFamily: font.id }, 'Narrative font family')}
                  className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    prefs.narrativeFontFamily === font.id
                      ? 'bg-blue-950 border-blue-500 text-blue-200 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span
                    className="text-base font-bold block mb-0.5"
                    style={{
                      fontFamily:
                        font.id === 'sans'
                          ? 'sans-serif'
                          : font.id === 'serif'
                          ? 'Georgia, serif'
                          : 'monospace',
                    }}
                  >
                    {font.preview}
                  </span>
                  <span className="text-[11px] block">{font.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Narrative Font Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-blue-400" />
                <span>Narrative Font Size</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {prefs.narrativeFontSize === 'sm'
                  ? '13px (Compact)'
                  : prefs.narrativeFontSize === 'base'
                  ? '15px (Standard)'
                  : prefs.narrativeFontSize === 'lg'
                  ? '17px (Comfortable)'
                  : '19px (Large Reading)'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'sm' as NarrativeFontSize, label: 'Small', size: '13px' },
                { id: 'base' as NarrativeFontSize, label: 'Medium', size: '15px' },
                { id: 'lg' as NarrativeFontSize, label: 'Large', size: '17px' },
                { id: 'xl' as NarrativeFontSize, label: 'XL', size: '19px' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update({ narrativeFontSize: s.id }, 'Narrative font size')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                    prefs.narrativeFontSize === s.id
                      ? 'bg-blue-950 border-blue-500 text-blue-200 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-semibold block">{s.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">{s.size}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Narrative Preview Strip */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">
              Live Narrative Typography Preview
            </span>
            <p
              className="text-slate-200 leading-relaxed transition-all"
              style={{
                fontFamily: 'var(--font-narrative, inherit)',
                fontSize: 'var(--font-size-narrative, inherit)',
              }}
            >
              "I stood at the threshold of the observatory overlooking a violet nebula. Floating upward, conscious that I was dreaming, the stars began to pulsate with crystalline clarity."
            </p>
          </div>
        </div>

        {/* Right Column: Layout Density & Time Formats */}
        <div className="space-y-4">
          {/* Card Density */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
                <span>Journal Feed Card Density</span>
              </label>
              <span className="text-[11px] text-slate-400 capitalize">
                {prefs.cardDensity} density
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'compact' as CardDensity, label: 'Compact', desc: '1-line excerpt' },
                { id: 'comfortable' as CardDensity, label: 'Comfortable', desc: '3-line excerpt' },
                { id: 'expanded' as CardDensity, label: 'Expanded', desc: 'Full text' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => update({ cardDensity: d.id }, 'Journal card density')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    prefs.cardDensity === d.id
                      ? 'bg-blue-950 border-blue-500 text-blue-200 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-semibold block">{d.label}</span>
                  <span className="text-[10px] text-slate-500 block">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Format */}
          <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1.5">
            <label htmlFor="date-format-select" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Date Display Format</span>
            </label>
            <select
              id="date-format-select"
              value={prefs.dateFormat}
              onChange={(e) =>
                update({ dateFormat: e.target.value as DateFormatOption }, 'Date display format')
              }
              className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="standard">Standard: Nov 6, 2026</option>
              <option value="iso">ISO 8601: 2026-11-06</option>
              <option value="european">European: 06 Nov 2026</option>
              <option value="relative">Relative: Today / Yesterday (within 7 days)</option>
            </select>
          </div>

          {/* Time Format */}
          <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Clock & Wake Time Format</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {prefs.timeFormat === '12h' ? '08:15 AM' : '08:15'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update({ timeFormat: '12h' }, 'Time format')}
                className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  prefs.timeFormat === '12h'
                    ? 'bg-blue-950 border-blue-500 text-blue-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                12-Hour (AM / PM)
              </button>
              <button
                type="button"
                onClick={() => update({ timeFormat: '24h' }, 'Time format')}
                className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  prefs.timeFormat === '24h'
                    ? 'bg-blue-950 border-blue-500 text-blue-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                24-Hour (Military)
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

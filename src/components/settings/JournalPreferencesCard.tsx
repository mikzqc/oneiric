import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import {
  preferencesService,
  PREFERENCES_CHANGED_EVENT,
} from '../../services/preferencesService';
import {
  DefaultLucidityOption,
  DefaultRecallOption,
  DefaultTechniqueOption,
  UserPreferences,
} from '../../types/preferences';

interface JournalPreferencesCardProps {
  onFeedback?: (type: 'success' | 'error', message: string) => void;
}

export const JournalPreferencesCard: React.FC<JournalPreferencesCardProps> = ({ onFeedback }) => {
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
    <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-5">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
        <BookOpen className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-100">Journaling & Editor Defaults</h2>
          <p className="text-xs text-slate-400">
            Configure initial state, protocol defaults, and editor behavior for new dream entries
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Default Lucidity */}
        <div className="space-y-1.5 p-3.5 rounded-lg bg-slate-900/50 border border-slate-800">
          <label htmlFor="default-lucidity" className="block text-xs font-semibold text-slate-200">
            Initial Lucidity State
          </label>
          <p className="text-[11px] text-slate-400 leading-snug">
            Default status selected when opening a new dream
          </p>
          <select
            id="default-lucidity"
            value={prefs.defaultLucidity}
            onChange={(e) =>
              update({ defaultLucidity: e.target.value as DefaultLucidityOption }, 'Default lucidity')
            }
            className="w-full mt-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="non-lucid">Non-Lucid (Standard dream)</option>
            <option value="lucid">Lucid Dream (Conscious)</option>
            <option value="uncertain">Uncertain / Pre-Lucid</option>
            <option value="last-used">Remember Last Used State</option>
          </select>
        </div>

        {/* Default Recall Quality */}
        <div className="space-y-1.5 p-3.5 rounded-lg bg-slate-900/50 border border-slate-800">
          <label htmlFor="default-recall" className="block text-xs font-semibold text-slate-200">
            Default Recall Quality
          </label>
          <p className="text-[11px] text-slate-400 leading-snug">
            Initial clarity rating for freshly recorded narratives
          </p>
          <select
            id="default-recall"
            value={prefs.defaultRecallQuality}
            onChange={(e) =>
              update({ defaultRecallQuality: e.target.value as DefaultRecallOption }, 'Default recall quality')
            }
            className="w-full mt-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="detailed">Detailed narrative</option>
            <option value="crystal">Crystal clear / Complete</option>
            <option value="fragmentary">Fragmentary scenes</option>
            <option value="hazy">Hazy / Faint fragments</option>
          </select>
        </div>

        {/* Default Induction Protocol */}
        <div className="space-y-1.5 p-3.5 rounded-lg bg-slate-900/50 border border-slate-800">
          <label htmlFor="default-technique" className="block text-xs font-semibold text-slate-200">
            Default Induction Protocol
          </label>
          <p className="text-[11px] text-slate-400 leading-snug">
            Pre-selects your routine practice technique
          </p>
          <select
            id="default-technique"
            value={prefs.defaultTechnique}
            onChange={(e) =>
              update({ defaultTechnique: e.target.value as DefaultTechniqueOption }, 'Default induction technique')
            }
            className="w-full mt-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="none">No Technique (Natural)</option>
            <option value="MILD">MILD (Mnemonic Induction)</option>
            <option value="WILD">WILD (Wake-Initiated)</option>
            <option value="SSILD">SSILD (Senses Initiated)</option>
            <option value="WBTB">WBTB (Wake-Back-To-Bed)</option>
            <option value="ADA">ADA (All Day Awareness)</option>
            <option value="Reality Checks">Reality Checks & Testing</option>
            <option value="last-used">Remember Last Used Protocol</option>
          </select>
        </div>
      </div>

      {/* Editor Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <label
          htmlFor="toggle-advanced-expand"
          className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
        >
          <input
            id="toggle-advanced-expand"
            type="checkbox"
            checked={prefs.autoExpandAdvancedFields}
            onChange={(e) =>
              update({ autoExpandAdvancedFields: e.target.checked }, 'Advanced parameters auto-expand')
            }
            className="w-4 h-4 mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200 block">
              Always Expand Advanced Parameters Drawer
            </span>
            <span className="text-[11px] text-slate-400 leading-snug block">
              Automatically opens False Awakening, Dream Control, Scenes, and Reality Check fields when creating an entry
            </span>
          </div>
        </label>

        <label
          htmlFor="toggle-word-counter"
          className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
        >
          <input
            id="toggle-word-counter"
            type="checkbox"
            checked={prefs.showWordCounter}
            onChange={(e) =>
              update({ showWordCounter: e.target.checked }, 'Word and character statistics')
            }
            className="w-4 h-4 mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200 block">
              Live Word & Character Statistics
            </span>
            <span className="text-[11px] text-slate-400 leading-snug block">
              Displays live word count, character count, and estimated reading duration in the dream editor
            </span>
          </div>
        </label>
      </div>
    </section>
  );
};

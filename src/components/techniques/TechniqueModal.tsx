import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  TechniqueDraft,
  TechniqueLog,
  TechniqueOutcome,
  TechniqueType,
} from '../../types/technique';
import { techniqueService } from '../../services/techniqueService';
import { getTodayDateString } from '../../utils/dateUtils';
import { Calendar, BookOpen, AlertCircle, Clock, Star, Layers } from 'lucide-react';

interface TechniqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogSaved: (log: TechniqueLog) => void;
  initialTechnique?: TechniqueType;
}

const COMPANION_OPTIONS: TechniqueType[] = [
  'WBTB',
  'MILD',
  'SSILD',
  'Reality Checks',
  'Intention Setting',
  'SATS',
  'WILD',
];

export const TechniqueModal: React.FC<TechniqueModalProps> = ({
  isOpen,
  onClose,
  onLogSaved,
  initialTechnique = 'MILD',
}) => {
  const [technique, setTechnique] = useState<TechniqueType>(initialTechnique);
  const [customTechniqueName, setCustomTechniqueName] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [bedTime, setBedTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [confidenceRating, setConfidenceRating] = useState<number>(3);
  const [secondaryTechniques, setSecondaryTechniques] = useState<TechniqueType[]>([]);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<TechniqueOutcome>('dream_recalled');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSecondary = (t: TechniqueType) => {
    setSecondaryTechniques((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (technique === 'Other' && !customTechniqueName.trim()) {
      setError('Please provide a name for your custom technique.');
      return;
    }

    try {
      setIsSaving(true);
      const draft: TechniqueDraft = {
        technique,
        customTechniqueName: technique === 'Other' ? customTechniqueName.trim() : undefined,
        date,
        bedTime: bedTime.trim() || undefined,
        wakeTime: wakeTime.trim() || undefined,
        confidenceRating,
        secondaryTechniques: secondaryTechniques.length > 0 ? secondaryTechniques : undefined,
        notes: notes.trim() || undefined,
        outcome,
        lucidDreamAchieved: outcome === 'lucid_dream',
      };

      const saved = await techniqueService.createLog(draft);
      onLogSaved(saved);
      onClose();
      // Reset form
      setNotes('');
      setCustomTechniqueName('');
      setBedTime('');
      setWakeTime('');
      setSecondaryTechniques([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save technique log.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Lucid Induction Attempt" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Technique Selection */}
        <div>
          <label htmlFor="tech-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Primary Protocol
          </label>
          <select
            id="tech-select"
            value={technique}
            onChange={(e) => setTechnique(e.target.value as TechniqueType)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="MILD">MILD — Mnemonic Induction of Lucid Dreams</option>
            <option value="SSILD">SSILD — Senses Initiated Lucid Dream</option>
            <option value="WBTB">WBTB — Wake Back To Bed</option>
            <option value="WILD">WILD — Wake Initiated Lucid Dream</option>
            <option value="Reality Checks">Reality Checks & All-Day Awareness</option>
            <option value="SATS">SATS — State Akin To Sleep</option>
            <option value="Intention Setting">Intention Setting & Prospective Memory</option>
            <option value="Other">Other / Custom Protocol</option>
          </select>
        </div>

        {technique === 'Other' && (
          <div>
            <label htmlFor="custom-tech-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Custom Technique Name
            </label>
            <input
              id="custom-tech-name"
              type="text"
              value={customTechniqueName}
              onChange={(e) => setCustomTechniqueName(e.target.value)}
              placeholder="e.g. Galantamine + Meditation, Lucid Mask, etc."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Date & Sleep Times */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="tech-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Date of Attempt
            </label>
            <input
              id="tech-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="bed-time" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Bedtime (Optional)
            </label>
            <input
              id="bed-time"
              type="time"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
              placeholder="23:00"
              className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="wake-time" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Wake Time (Optional)
            </label>
            <input
              id="wake-time"
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              placeholder="06:30"
              className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Companion / Secondary techniques on the same night */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Companion Protocols (Combined on same night):</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMPANION_OPTIONS.filter((opt) => opt !== technique).map((opt) => {
              const isSelected = secondaryTechniques.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleSecondary(opt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950 border-blue-500 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  +{opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subjective Confidence Rating */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Subjective Confidence ({confidenceRating}/5)</span>
            </label>
            <span className="text-[11px] text-slate-400">Mental focus & intention clarity</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setConfidenceRating(lvl)}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  confidenceRating >= lvl
                    ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Observed Outcome */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Observed Morning Outcome
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOutcome('no_recall')}
              className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                outcome === 'no_recall'
                  ? 'bg-slate-800 border-slate-500 text-slate-100 font-semibold shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs">No Dream Recalled</span>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('dream_recalled')}
              className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                outcome === 'dream_recalled'
                  ? 'bg-blue-950/70 border-blue-500 text-blue-200 font-semibold shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs">Dream Recalled (Non-Lucid)</span>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('lucid_dream')}
              className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                outcome === 'lucid_dream'
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-semibold shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs">Lucid Dream</span>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="tech-notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            Attempt Notes & Observations (Optional)
          </label>
          <textarea
            id="tech-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Woke at 4:30 AM, read for 20 min, cycled senses 3 times before falling asleep..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            Record Attempt
          </Button>
        </div>
      </form>
    </Modal>
  );
};

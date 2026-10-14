import React, { useState, useEffect } from 'react';
import { DreamDraft, DreamEntry, PREDEFINED_EMOTIONS, LucidityLevel, RecallQuality } from '../../types/dream';
import { dreamService } from '../../services/dreamService';
import { getTodayDateString } from '../../utils/dateUtils';
import { Button } from '../common/Button';
import {
  Sparkles,
  Star,
  Clock,
  Calendar,
  Tag as TagIcon,
  Smile,
  Compass,
  Check,
  AlertCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Brain,
  Shield,
  Layers,
} from 'lucide-react';

interface DreamEditorProps {
  initialDream?: DreamEntry;
  onSaved: (dream: DreamEntry) => void;
  onCancel: () => void;
  isModal?: boolean;
}

const DRAFT_STORAGE_KEY = 'oneiric_active_dream_draft';

function getInitialDraft(isEditing: boolean) {
  if (isEditing) return null;
  try {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);
      if (parsed.title || parsed.narrative) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export const DreamEditor: React.FC<DreamEditorProps> = ({
  initialDream,
  onSaved,
  onCancel,
  isModal = false,
}) => {
  const isEditing = !!initialDream;
  const draft = getInitialDraft(isEditing);

  // Initial values
  const [title, setTitle] = useState(initialDream?.title || draft?.title || '');
  const [narrative, setNarrative] = useState(initialDream?.narrative || draft?.narrative || '');
  const [date, setDate] = useState(initialDream?.date || draft?.date || getTodayDateString());
  const [wakeUpTime, setWakeUpTime] = useState(initialDream?.wakeUpTime || draft?.wakeUpTime || '');
  const [vividness, setVividness] = useState<number>(initialDream?.vividness || draft?.vividness || 3);
  const [recallQuality, setRecallQuality] = useState<RecallQuality>(
    initialDream?.recallQuality || draft?.recallQuality || 'detailed'
  );
  const [lucidity, setLucidity] = useState<LucidityLevel>(
    initialDream?.lucidity || draft?.lucidity || 'non-lucid'
  );
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(
    initialDream?.emotions || draft?.emotions || []
  );
  const [tags, setTags] = useState<string[]>(initialDream?.tags || draft?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [dreamSignsNotes, setDreamSignsNotes] = useState(
    initialDream?.dreamSignsNotes || draft?.dreamSignsNotes || ''
  );

  // Phase 2 Intelligence Fields
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    !!(
      initialDream?.falseAwakening ||
      (initialDream?.dreamControl && initialDream.dreamControl > 0) ||
      initialDream?.interpretationNotes
    )
  );
  const [falseAwakening, setFalseAwakening] = useState<boolean>(initialDream?.falseAwakening || false);
  const [believedAwake, setBelievedAwake] = useState<boolean>(
    initialDream?.falseAwakeningDetails?.believedAwake ?? true
  );
  const [faEnvironment, setFaEnvironment] = useState<string>(
    initialDream?.falseAwakeningDetails?.environmentDescription || ''
  );
  const [faTrigger, setFaTrigger] = useState<string>(
    initialDream?.falseAwakeningDetails?.triggerOrAnomaly || ''
  );
  const [faRealityCheckNotes, setFaRealityCheckNotes] = useState<string>(
    initialDream?.falseAwakeningDetails?.realityCheckNotes || ''
  );

  const [dreamControl, setDreamControl] = useState<number>(initialDream?.dreamControl || 0);
  const [scenesCount, setScenesCount] = useState<number>(initialDream?.scenesCount || 1);
  const [interpretationNotes, setInterpretationNotes] = useState<string>(
    initialDream?.interpretationNotes || ''
  );
  const [realityCheckInput, setRealityCheckInput] = useState<string>('');
  const [usefulRealityChecks, setUsefulRealityChecks] = useState<string[]>(
    initialDream?.realityChecksUseful || []
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(!!draft);

  // Load distinct tags from DB
  useEffect(() => {
    dreamService.getDistinctTags().then((t) => setAvailableTags(t));
  }, []);

  // Persist draft for unsaved work when creating
  useEffect(() => {
    if (!isEditing) {
      if (title.trim() || narrative.trim() || dreamSignsNotes.trim()) {
        const draftObj = {
          title,
          narrative,
          date,
          wakeUpTime,
          vividness,
          recallQuality,
          lucidity,
          emotions: selectedEmotions,
          tags,
          dreamSignsNotes,
          falseAwakening,
          dreamControl,
          scenesCount,
          interpretationNotes,
          realityChecksUseful: usefulRealityChecks,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftObj));
      }
    }
  }, [
    isEditing,
    title,
    narrative,
    date,
    wakeUpTime,
    vividness,
    recallQuality,
    lucidity,
    selectedEmotions,
    tags,
    dreamSignsNotes,
    falseAwakening,
    dreamControl,
    scenesCount,
    interpretationNotes,
    usefulRealityChecks,
  ]);

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]
    );
  };

  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags((prev) => [...prev, cleanTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleAddRealityCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = realityCheckInput.trim();
    if (clean && !usefulRealityChecks.includes(clean)) {
      setUsefulRealityChecks((prev) => [...prev, clean]);
      setRealityCheckInput('');
    }
  };

  const removeRealityCheck = (item: string) => {
    setUsefulRealityChecks((prev) => prev.filter((r) => r !== item));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanTitle = title.trim();
    const cleanNarrative = narrative.trim();

    if (!cleanTitle) {
      setValidationError('Please give your dream a title.');
      return;
    }

    if (!cleanNarrative) {
      setValidationError('Please enter a dream narrative.');
      return;
    }

    if (!date) {
      setValidationError('Please select the date of the dream.');
      return;
    }

    try {
      setIsSaving(true);
      const draftData: DreamDraft = {
        title: cleanTitle,
        narrative: cleanNarrative,
        date,
        wakeUpTime: wakeUpTime.trim() || undefined,
        vividness,
        recallQuality,
        lucidity,
        emotions: selectedEmotions,
        tags,
        dreamSignsNotes: dreamSignsNotes.trim() || undefined,

        // Phase 2 Fields
        scenesCount: Math.max(1, scenesCount),
        dreamControl: dreamControl > 0 ? dreamControl : undefined,
        falseAwakening,
        falseAwakeningDetails: falseAwakening
          ? {
              believedAwake,
              environmentDescription: faEnvironment.trim() || undefined,
              triggerOrAnomaly: faTrigger.trim() || undefined,
              realityCheckNotes: faRealityCheckNotes.trim() || undefined,
            }
          : undefined,
        realityChecksUseful: usefulRealityChecks.length > 0 ? usefulRealityChecks : undefined,
        interpretationNotes: interpretationNotes.trim() || undefined,
      };

      let savedEntry: DreamEntry;
      if (isEditing && initialDream) {
        await dreamService.updateDream(initialDream.id, draftData);
        savedEntry = {
          ...initialDream,
          ...draftData,
          updatedAt: Date.now(),
        };
      } else {
        savedEntry = await dreamService.createDream(draftData);
        // Clear local storage draft
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      onSaved(savedEntry);
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save dream.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasRestoredDraft(false);
    setTitle('');
    setNarrative('');
    setDreamSignsNotes('');
    setTags([]);
    setSelectedEmotions([]);
    setVividness(3);
    setLucidity('non-lucid');
    setFalseAwakening(false);
    setDreamControl(0);
    setInterpretationNotes('');
  };

  const wordCount = narrative.trim() ? narrative.trim().split(/\s+/).length : 0;

  const vividnessLabels: Record<number, string> = {
    1: '1 - Faint & Ghostly',
    2: '2 - Vague Outlines',
    3: '3 - Moderately Vivid',
    4: '4 - Rich & Colorful',
    5: '5 - Hyper-Real / Crystal',
  };

  const controlLabels: Record<number, string> = {
    0: 'None / Observer',
    1: '1 - Passive spectator',
    2: '2 - Subtle influence',
    3: '3 - Moderate deliberate control',
    4: '4 - High agency & flight control',
    5: '5 - Absolute reality architect',
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Draft Restored Banner */}
      {hasRestoredDraft && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/70 border border-indigo-700/60 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Restored an unsaved dream draft from your previous session.</span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="text-xs text-indigo-400 hover:text-indigo-100 underline ml-2 cursor-pointer"
          >
            Discard draft
          </button>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="dream-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Dream Title <span className="text-indigo-400">*</span>
        </label>
        <input
          id="dream-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Flight through the bioluminescent caverns"
          className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
          autoFocus={!isModal}
        />
      </div>

      {/* Lucidity Status (Three Segments) */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Lucidity Status <span className="text-indigo-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setLucidity('non-lucid')}
            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              lucidity === 'non-lucid'
                ? 'bg-slate-800 border-slate-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Non-Lucid</span>
              {lucidity === 'non-lucid' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>
            <p className="text-xs text-slate-400 leading-snug">Standard dream; unaware that I was dreaming.</p>
          </button>

          <button
            type="button"
            onClick={() => setLucidity('lucid')}
            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              lucidity === 'lucid'
                ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-900/40 lucid-glow'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Lucid Dream
              </span>
              {lucidity === 'lucid' && <Check className="w-4 h-4 text-cyan-400" />}
            </div>
            <p className="text-xs text-slate-400 leading-snug">Consciously aware that I was dreaming while asleep.</p>
          </button>

          <button
            type="button"
            onClick={() => setLucidity('uncertain')}
            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              lucidity === 'uncertain'
                ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-300">Uncertain / Pre-Lucid</span>
              {lucidity === 'uncertain' && <Check className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-xs text-slate-400 leading-snug">Brief suspicion or fleeting doubt without control.</p>
          </button>
        </div>
      </div>

      {/* Date, Wake-up Time & Recall Quality Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Date */}
        <div>
          <label htmlFor="dream-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Date of Dream
          </label>
          <input
            id="dream-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Wake-up Time */}
        <div>
          <label htmlFor="dream-time" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Approx. Wake-up Time
          </label>
          <input
            id="dream-time"
            type="time"
            value={wakeUpTime}
            onChange={(e) => setWakeUpTime(e.target.value)}
            placeholder="07:00"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Recall Quality */}
        <div>
          <label htmlFor="dream-recall" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            Recall Quality
          </label>
          <select
            id="dream-recall"
            value={recallQuality}
            onChange={(e) => setRecallQuality(e.target.value as RecallQuality)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="hazy">Hazy / Faint fragments</option>
            <option value="fragmentary">Fragmentary scenes</option>
            <option value="detailed">Detailed narrative</option>
            <option value="crystal">Crystal clear / Complete</option>
          </select>
        </div>
      </div>

      {/* Vividness Slider (1 - 5) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="dream-vividness" className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Vividness Rating
          </label>
          <span className="text-xs font-medium text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/40">
            {vividnessLabels[vividness]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setVividness(lvl)}
              className={`flex-1 py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                vividness >= lvl
                  ? 'bg-amber-950/60 border-amber-600/60 text-amber-300 font-semibold shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Star
                  className={`w-3.5 h-3.5 ${
                    vividness >= lvl ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                  }`}
                />
                <span className="text-xs">{lvl}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dream Narrative */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="dream-narrative" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Dream Narrative <span className="text-indigo-400">*</span>
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>
        <textarea
          id="dream-narrative"
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Describe your dream in vivid detail. What did you see, hear, feel, and experience? What led up to your awareness?"
          rows={8}
          className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
        />
      </div>

      {/* Dream Signs Notes */}
      <div>
        <label htmlFor="dream-signs" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Dream Signs & Lucidity Triggers (Optional)
        </label>
        <textarea
          id="dream-signs"
          value={dreamSignsNotes}
          onChange={(e) => setDreamSignsNotes(e.target.value)}
          placeholder="Note any dream signs: impossible physics, strange clocks/mirrors, breathing underwater, recurring people, or what triggered your lucidity."
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Emotions Selection */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-indigo-400" />
          Emotions & Tone
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PREDEFINED_EMOTIONS.map((emotion) => {
            const isSelected = selectedEmotions.includes(emotion);
            return (
              <button
                key={emotion}
                type="button"
                onClick={() => toggleEmotion(emotion)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 font-semibold shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                {emotion}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags Selection & Creation */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5 text-indigo-400" />
          Tags & Categories
        </label>

        {/* Existing & Active tags */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-700/60 text-xs text-indigo-200"
            >
              <span className="text-indigo-400">#</span>
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-indigo-400 hover:text-indigo-100 cursor-pointer ml-1 text-sm font-bold"
                aria-label={`Remove tag ${tag}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        {/* Add custom tag input */}
        <div className="flex items-center gap-2 max-w-sm">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add custom tag (press Enter)"
            className="grow px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => handleAddTag()}>
            Add
          </Button>
        </div>

        {/* Quick Suggestions from DB */}
        {availableTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 items-center">
            <span className="text-[11px] text-slate-300 mr-1">Suggestions:</span>
            {availableTags
              .filter((t) => !tags.includes(t))
              .slice(0, 6)
              .map((suggested) => (
                <button
                  key={suggested}
                  type="button"
                  onClick={() => setTags((prev) => [...prev, suggested])}
                  className="text-[11px] text-slate-300 hover:text-indigo-300 px-2 py-0.5 rounded bg-slate-900/40 hover:bg-slate-800 border border-slate-800/80 cursor-pointer"
                >
                  +{suggested}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* PHASE 2: Advanced Intelligence Collapsible Section */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-left transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Advanced Pattern & Lucidity Intelligence
              </span>
              <span className="text-[11px] text-slate-400">
                False awakenings, dream control level, scene shifts, and psychological interpretations
              </span>
            </div>
          </div>
          {isAdvancedOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isAdvancedOpen && (
          <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-5 animate-fadeIn">
            {/* False Awakening Checkbox & Details */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={falseAwakening}
                  onChange={(e) => setFalseAwakening(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    False Awakening Occurred
                  </span>
                  <span className="text-[11px] text-slate-400 leading-relaxed block">
                    Believed you woke up, got out of bed, or began morning routines while still asleep.
                  </span>
                </div>
              </label>

              {falseAwakening && (
                <div className="pl-7 space-y-3 pt-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={believedAwake}
                      onChange={(e) => setBelievedAwake(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                    />
                    <span>I genuinely believed I was awake initially</span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Apparent waking environment:
                    </label>
                    <input
                      type="text"
                      value={faEnvironment}
                      onChange={(e) => setFaEnvironment(e.target.value)}
                      placeholder="e.g. My real bedroom, childhood home, hotel room"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      What revealed the experience was a dream?
                    </label>
                    <input
                      type="text"
                      value={faTrigger}
                      onChange={(e) => setFaTrigger(e.target.value)}
                      placeholder="e.g. Digital clock numbers backwards, light switch failed, nose-pinch check"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Reality check observations:
                    </label>
                    <input
                      type="text"
                      value={faRealityCheckNotes}
                      onChange={(e) => setFaRealityCheckNotes(e.target.value)}
                      placeholder="e.g. Performed nose-pinch test immediately upon noticing weird clock"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dream Control & Scene Count Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-800/80">
              {/* Dream Control Rating */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dream Control Level</span>
                  </label>
                  <span className="text-[11px] text-indigo-300 font-medium">
                    {controlLabels[dreamControl]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDreamControl(lvl)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        dreamControl === lvl
                          ? 'bg-indigo-950 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of remembered scenes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Remembered Scenes Count</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={scenesCount}
                    onChange={(e) => setScenesCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <span className="text-xs text-slate-400">distinct sequential scenes</span>
                </div>
              </div>
            </div>

            {/* Reality Checks that could have helped */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Reality Checks that were (or would have been) useful:</span>
              </label>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {usefulRealityChecks.map((rc) => (
                  <span
                    key={rc}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300"
                  >
                    <span>{rc}</span>
                    <button
                      type="button"
                      onClick={() => removeRealityCheck(rc)}
                      className="text-slate-400 hover:text-slate-100 cursor-pointer ml-1 text-xs font-bold"
                      aria-label={`Remove reality check ${rc}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={realityCheckInput}
                  onChange={(e) => setRealityCheckInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRealityCheck();
                    }
                  }}
                  placeholder="e.g. Nose pinch, reading text twice"
                  className="grow px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <Button type="button" size="sm" variant="secondary" onClick={() => handleAddRealityCheck()}>
                  Add Check
                </Button>
              </div>
            </div>

            {/* Personal Interpretation Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Personal Dream Meaning & Waking-Life Interpretation (Private):</span>
              </label>
              <textarea
                value={interpretationNotes}
                onChange={(e) => setInterpretationNotes(e.target.value)}
                placeholder="What personal significance, waking reflections, emotional symbols, or subconscious parallels do you associate with this dream?"
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800/80">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="celestial" isLoading={isSaving}>
          {isEditing ? 'Save Changes' : 'Record Dream'}
        </Button>
      </div>
    </form>
  );
};

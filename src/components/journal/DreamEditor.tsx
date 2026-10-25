import React, { useState, useEffect } from 'react';
import { DreamDraft, DreamEntry, DreamScene, PREDEFINED_EMOTIONS, LucidityLevel, RecallQuality } from '../../types/dream';
import { dreamService } from '../../services/dreamService';
import { celebrationService } from '../../services/celebrationService';
import { wakeTimeService, WakeTimeConfig, WAKE_TIME_CHANGED_EVENT } from '../../services/wakeTimeService';
import { getTodayDateString } from '../../utils/dateUtils';
import { Button } from '../common/Button';
import {
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
  Plus,
  Trash2,
  Link2,
  FileText,
  CheckCircle2,
  Globe,
} from 'lucide-react';

interface DreamEditorProps {
  initialDream?: DreamEntry;
  onSaved: (dream: DreamEntry) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isModal?: boolean;
}

const DRAFT_STORAGE_KEY = 'oneiric_active_dream_draft';
const getEditDraftKey = (id: string) => `oneiric_edit_draft_${id}`;

interface SavedDraftPayload extends Partial<DreamDraft> {
  savedAt?: number;
}

function hasMeaningfulAdvancedData(target?: Partial<DreamDraft> | null): boolean {
  if (!target) return false;
  return Boolean(
    target.falseAwakening ||
      (target.dreamControl !== undefined && target.dreamControl > 0) ||
      (target.interpretationNotes && target.interpretationNotes.trim().length > 0) ||
      (Array.isArray(target.scenes) && target.scenes.length > 0) ||
      (Array.isArray(target.relatedDreamIds) && target.relatedDreamIds.length > 0) ||
      (Array.isArray(target.realityChecksUseful) && target.realityChecksUseful.length > 0) ||
      (target.falseAwakeningDetails &&
        (target.falseAwakeningDetails.environmentDescription?.trim() ||
          target.falseAwakeningDetails.triggerOrAnomaly?.trim() ||
          target.falseAwakeningDetails.realityCheckNotes?.trim()))
  );
}

function getInitialDraft(isEditing: boolean, initialId?: string): SavedDraftPayload | null {
  try {
    const key = isEditing && initialId ? getEditDraftKey(initialId) : DRAFT_STORAGE_KEY;
    const savedDraft = localStorage.getItem(key);
    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed.title ||
          parsed.narrative ||
          parsed.dreamSignsNotes ||
          parsed.interpretationNotes ||
          parsed.falseAwakening ||
          (parsed.dreamControl !== undefined && parsed.dreamControl > 0) ||
          (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) ||
          (Array.isArray(parsed.tags) && parsed.tags.length > 0) ||
          (Array.isArray(parsed.emotions) && parsed.emotions.length > 0))
      ) {
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
  onDelete,
  isModal = false,
}) => {
  const isEditing = !!initialDream;
  const newDraft = getInitialDraft(false);
  const recoveredEditDraft = isEditing && initialDream ? getInitialDraft(true, initialDream.id) : null;

  // Initial values
  const [title, setTitle] = useState(initialDream?.title ?? newDraft?.title ?? '');
  const [narrative, setNarrative] = useState(initialDream?.narrative ?? newDraft?.narrative ?? '');
  const [date, setDate] = useState(initialDream?.date ?? newDraft?.date ?? getTodayDateString());
  const [wakeConfig, setWakeConfig] = useState<WakeTimeConfig>(() =>
    wakeTimeService.getWakeTimeConfig()
  );
  const [wakeUpTime, setWakeUpTime] = useState(() => {
    if (initialDream?.wakeUpTime !== undefined) return initialDream.wakeUpTime;
    if (newDraft?.wakeUpTime !== undefined) return newDraft.wakeUpTime;
    return wakeTimeService.getInitialWakeTime();
  });
  const [vividness, setVividness] = useState<number>(initialDream?.vividness ?? newDraft?.vividness ?? 3);
  const [recallQuality, setRecallQuality] = useState<RecallQuality>(
    initialDream?.recallQuality ?? newDraft?.recallQuality ?? 'detailed'
  );
  const [lucidity, setLucidity] = useState<LucidityLevel>(
    initialDream?.lucidity ?? newDraft?.lucidity ?? 'non-lucid'
  );
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(
    initialDream?.emotions ?? newDraft?.emotions ?? []
  );
  const [tags, setTags] = useState<string[]>(initialDream?.tags ?? newDraft?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [dreamSignsNotes, setDreamSignsNotes] = useState(
    initialDream?.dreamSignsNotes ?? newDraft?.dreamSignsNotes ?? ''
  );

  // Autosave and Draft Recovery States
  const [hasRestoredDraft, setHasRestoredDraft] = useState(!isEditing && !!newDraft);
  const [hasRestoredEditDraft, setHasRestoredEditDraft] = useState(Boolean(recoveredEditDraft));
  const [autosaveTime, setAutosaveTime] = useState<string | null>(null);

  // Sync auto-detected wake time changes
  useEffect(() => {
    const handleWakeChange = (e: Event) => {
      const custom = e as CustomEvent<WakeTimeConfig>;
      if (custom.detail) {
        setWakeConfig(custom.detail);
        if (!isEditing && !newDraft?.wakeUpTime && !custom.detail.isManualOverride) {
          setWakeUpTime(custom.detail.wakeTime);
        }
      }
    };
    window.addEventListener(WAKE_TIME_CHANGED_EVENT, handleWakeChange);
    return () => window.removeEventListener(WAKE_TIME_CHANGED_EVENT, handleWakeChange);
  }, [isEditing, newDraft]);

  const handleWakeUpTimeChange = (val: string) => {
    setWakeUpTime(val);
    if (!isEditing && val) {
      wakeTimeService.setManualWakeTime(val);
    }
  };

  // Related Dreams Linking
  const [relatedDreamIds, setRelatedDreamIds] = useState<string[]>(
    initialDream?.relatedDreamIds ?? newDraft?.relatedDreamIds ?? []
  );
  const [availableDreamsForLinking, setAvailableDreamsForLinking] = useState<DreamEntry[]>([]);

  // Phase 2 Intelligence Fields
  const [scenes, setScenes] = useState<DreamScene[]>(() => {
    if (initialDream?.scenes && initialDream.scenes.length > 0) {
      return initialDream.scenes;
    }
    if (newDraft?.scenes && newDraft.scenes.length > 0) {
      return newDraft.scenes;
    }
    return [];
  });

  const [falseAwakening, setFalseAwakening] = useState<boolean>(
    initialDream?.falseAwakening ?? newDraft?.falseAwakening ?? false
  );
  const [believedAwake, setBelievedAwake] = useState<boolean>(
    initialDream?.falseAwakeningDetails?.believedAwake ??
      newDraft?.falseAwakeningDetails?.believedAwake ??
      true
  );
  const [faEnvironment, setFaEnvironment] = useState<string>(
    initialDream?.falseAwakeningDetails?.environmentDescription ??
      newDraft?.falseAwakeningDetails?.environmentDescription ??
      ''
  );
  const [faTrigger, setFaTrigger] = useState<string>(
    initialDream?.falseAwakeningDetails?.triggerOrAnomaly ??
      newDraft?.falseAwakeningDetails?.triggerOrAnomaly ??
      ''
  );
  const [faRealityCheckNotes, setFaRealityCheckNotes] = useState<string>(
    initialDream?.falseAwakeningDetails?.realityCheckNotes ??
      newDraft?.falseAwakeningDetails?.realityCheckNotes ??
      ''
  );

  const [dreamControl, setDreamControl] = useState<number>(
    initialDream?.dreamControl ?? newDraft?.dreamControl ?? 0
  );
  const [scenesCount, setScenesCount] = useState<number>(() => {
    if (initialDream?.scenes?.length) return initialDream.scenes.length;
    if (initialDream?.scenesCount !== undefined) return initialDream.scenesCount;
    if (newDraft?.scenes?.length) return newDraft.scenes.length;
    if (newDraft?.scenesCount !== undefined) return newDraft.scenesCount;
    return 1;
  });
  const [interpretationNotes, setInterpretationNotes] = useState<string>(
    initialDream?.interpretationNotes ?? newDraft?.interpretationNotes ?? ''
  );
  const [realityCheckInput, setRealityCheckInput] = useState<string>('');
  const [usefulRealityChecks, setUsefulRealityChecks] = useState<string[]>(
    initialDream?.realityChecksUseful ?? newDraft?.realityChecksUseful ?? []
  );

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    hasMeaningfulAdvancedData(initialDream) || (!isEditing && hasMeaningfulAdvancedData(newDraft))
  );

  const isDirty = isEditing
    ? title !== (initialDream?.title || '') ||
      narrative !== (initialDream?.narrative || '') ||
      dreamSignsNotes !== (initialDream?.dreamSignsNotes || '') ||
      vividness !== (initialDream?.vividness || 3) ||
      lucidity !== (initialDream?.lucidity || 'non-lucid') ||
      falseAwakening !== (initialDream?.falseAwakening || false) ||
      dreamControl !== (initialDream?.dreamControl || 0) ||
      interpretationNotes !== (initialDream?.interpretationNotes || '') ||
      scenes.length !== (initialDream?.scenes?.length || 0) ||
      wakeUpTime !== (initialDream?.wakeUpTime || '')
    : Boolean(
        title.trim() ||
          narrative.trim() ||
          dreamSignsNotes.trim() ||
          interpretationNotes.trim() ||
          scenes.length > 0 ||
          falseAwakening ||
          dreamControl > 0 ||
          tags.length > 0 ||
          selectedEmotions.length > 0
      );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddScene = () => {
    const nextNumber = scenes.length + 1;
    const newScene: DreamScene = {
      id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sceneNumber: nextNumber,
      title: '',
      narrative: '',
      lucid: false,
      falseAwakening: false,
    };
    const updated = [...scenes, newScene];
    setScenes(updated);
    setScenesCount(updated.length);
  };

  const handleUpdateScene = (id: string, updates: Partial<DreamScene>) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleRemoveScene = (id: string) => {
    const filtered = scenes.filter((s) => s.id !== id);
    const renumbered = filtered.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    setScenes(renumbered);
    setScenesCount(Math.max(1, renumbered.length));
  };

  // Load distinct tags and existing dreams for linking from DB
  useEffect(() => {
    dreamService.getDistinctTags().then((t) => setAvailableTags(t));
    dreamService.getAllDreams().then((all) => {
      setAvailableDreamsForLinking(all.filter((d) => d.id !== initialDream?.id));
    });
  }, [initialDream?.id]);

  // Persist draft for unsaved work (both new dreams and edits)
  useEffect(() => {
    // Prevent clobbering an existing edit draft on initial mount before user restores/discards
    if (isEditing && hasRestoredEditDraft) {
      return;
    }

    const hasContent = Boolean(
      title.trim() ||
        narrative.trim() ||
        dreamSignsNotes.trim() ||
        interpretationNotes.trim() ||
        scenes.length > 0 ||
        falseAwakening ||
        dreamControl > 0 ||
        tags.length > 0 ||
        selectedEmotions.length > 0
    );

    if (hasContent) {
      const draftObj: SavedDraftPayload = {
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
        falseAwakeningDetails: falseAwakening
          ? {
              believedAwake,
              environmentDescription: faEnvironment.trim() || undefined,
              triggerOrAnomaly: faTrigger.trim() || undefined,
              realityCheckNotes: faRealityCheckNotes.trim() || undefined,
            }
          : undefined,
        dreamControl,
        scenesCount: scenes.length > 0 ? scenes.length : scenesCount,
        scenes: scenes.length > 0 ? scenes : undefined,
        interpretationNotes,
        realityChecksUseful: usefulRealityChecks,
        relatedDreamIds: relatedDreamIds.length > 0 ? relatedDreamIds : undefined,
        savedAt: Date.now(),
      };

      const key = isEditing && initialDream ? getEditDraftKey(initialDream.id) : DRAFT_STORAGE_KEY;
      try {
        localStorage.setItem(key, JSON.stringify(draftObj));
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTimeout(() => setAutosaveTime(timeStr), 0);
      } catch {
        // ignore storage errors
      }
    } else if (!isEditing) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setTimeout(() => setAutosaveTime(null), 0);
    }
  }, [
    isEditing,
    initialDream,
    hasRestoredEditDraft,
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
    believedAwake,
    faEnvironment,
    faTrigger,
    faRealityCheckNotes,
    dreamControl,
    scenesCount,
    scenes,
    interpretationNotes,
    usefulRealityChecks,
    relatedDreamIds,
  ]);

  const applyRecoveredEditDraft = () => {
    if (!recoveredEditDraft) return;
    if (recoveredEditDraft.title !== undefined) setTitle(recoveredEditDraft.title);
    if (recoveredEditDraft.narrative !== undefined) setNarrative(recoveredEditDraft.narrative);
    if (recoveredEditDraft.date !== undefined) setDate(recoveredEditDraft.date);
    if (recoveredEditDraft.wakeUpTime !== undefined) setWakeUpTime(recoveredEditDraft.wakeUpTime);
    if (recoveredEditDraft.vividness !== undefined) setVividness(recoveredEditDraft.vividness);
    if (recoveredEditDraft.recallQuality !== undefined) setRecallQuality(recoveredEditDraft.recallQuality);
    if (recoveredEditDraft.lucidity !== undefined) setLucidity(recoveredEditDraft.lucidity);
    if (recoveredEditDraft.emotions !== undefined) setSelectedEmotions(recoveredEditDraft.emotions);
    if (recoveredEditDraft.tags !== undefined) setTags(recoveredEditDraft.tags);
    if (recoveredEditDraft.dreamSignsNotes !== undefined) setDreamSignsNotes(recoveredEditDraft.dreamSignsNotes);
    if (recoveredEditDraft.scenes !== undefined) setScenes(recoveredEditDraft.scenes);
    if (recoveredEditDraft.scenesCount !== undefined) setScenesCount(recoveredEditDraft.scenesCount);
    if (recoveredEditDraft.relatedDreamIds !== undefined) setRelatedDreamIds(recoveredEditDraft.relatedDreamIds);

    // Phase 2 Enhanced Intelligence Fields Restoration
    if (recoveredEditDraft.falseAwakening !== undefined) {
      setFalseAwakening(recoveredEditDraft.falseAwakening);
    }
    if (recoveredEditDraft.falseAwakeningDetails !== undefined) {
      if (recoveredEditDraft.falseAwakeningDetails.believedAwake !== undefined) {
        setBelievedAwake(recoveredEditDraft.falseAwakeningDetails.believedAwake);
      }
      if (recoveredEditDraft.falseAwakeningDetails.environmentDescription !== undefined) {
        setFaEnvironment(recoveredEditDraft.falseAwakeningDetails.environmentDescription);
      }
      if (recoveredEditDraft.falseAwakeningDetails.triggerOrAnomaly !== undefined) {
        setFaTrigger(recoveredEditDraft.falseAwakeningDetails.triggerOrAnomaly);
      }
      if (recoveredEditDraft.falseAwakeningDetails.realityCheckNotes !== undefined) {
        setFaRealityCheckNotes(recoveredEditDraft.falseAwakeningDetails.realityCheckNotes);
      }
    }
    if (recoveredEditDraft.dreamControl !== undefined) {
      setDreamControl(recoveredEditDraft.dreamControl);
    }
    if (recoveredEditDraft.interpretationNotes !== undefined) {
      setInterpretationNotes(recoveredEditDraft.interpretationNotes);
    }
    if (recoveredEditDraft.realityChecksUseful !== undefined) {
      setUsefulRealityChecks(recoveredEditDraft.realityChecksUseful);
    }

    if (hasMeaningfulAdvancedData(recoveredEditDraft)) {
      setIsAdvancedOpen(true);
    }

    setHasRestoredEditDraft(false);
  };

  const discardRecoveredEditDraft = () => {
    if (initialDream) {
      localStorage.removeItem(getEditDraftKey(initialDream.id));
    }
    setHasRestoredEditDraft(false);
  };

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
        scenesCount: scenes.length > 0 ? scenes.length : Math.max(1, scenesCount),
        scenes: scenes.length > 0 ? scenes : undefined,
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
        relatedDreamIds: relatedDreamIds.length > 0 ? relatedDreamIds : undefined,
      };

      let savedEntry: DreamEntry;
      if (isEditing && initialDream) {
        await dreamService.updateDream(initialDream.id, draftData);
        localStorage.removeItem(getEditDraftKey(initialDream.id));
        savedEntry = {
          ...initialDream,
          ...draftData,
          updatedAt: Date.now(),
        };
      } else {
        // Derive celebration eligibility before saving to accurately count existing entries
        const eligibility = await celebrationService.checkCelebrationEligibility(
          !isEditing,
          draftData.lucidity
        );

        savedEntry = await dreamService.createDream(draftData);
        // Clear local storage draft
        localStorage.removeItem(DRAFT_STORAGE_KEY);

        // If newly saved entry is confirmed as lucid, trigger party celebration
        if (eligibility.shouldCelebrate) {
          celebrationService.triggerCelebration({
            isFirstLucid: eligibility.isFirstLucid,
            lucidCount: eligibility.lucidCount,
            dreamTitle: savedEntry.title,
            dreamId: savedEntry.id,
          });
        }
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
    setDate(getTodayDateString());
    setWakeUpTime(wakeTimeService.getInitialWakeTime());
    setVividness(3);
    setRecallQuality('detailed');
    setLucidity('non-lucid');
    setSelectedEmotions([]);
    setTags([]);
    setDreamSignsNotes('');
    setFalseAwakening(false);
    setBelievedAwake(true);
    setFaEnvironment('');
    setFaTrigger('');
    setFaRealityCheckNotes('');
    setDreamControl(0);
    setScenesCount(1);
    setScenes([]);
    setInterpretationNotes('');
    setUsefulRealityChecks([]);
    setRelatedDreamIds([]);
    setIsAdvancedOpen(false);
  };

  const wordCount = narrative.trim() ? narrative.trim().split(/\s+/).length : 0;
  const charCount = narrative.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

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
      {/* Draft Restored Banner (New Dream) */}
      {hasRestoredDraft && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Restored an unsaved dream draft from your previous session.</span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="text-xs text-blue-400 hover:text-blue-300 underline ml-2 cursor-pointer"
          >
            Discard draft
          </button>
        </div>
      )}

      {/* Recovered Edit Draft Banner (Existing Dream) */}
      {hasRestoredEditDraft && recoveredEditDraft && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Found unsaved edits for this entry from your last session ({recoveredEditDraft.savedAt ? new Date(recoveredEditDraft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier'}).</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={applyRecoveredEditDraft}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs cursor-pointer"
            >
              Restore Edits
            </button>
            <button
              type="button"
              onClick={discardRecoveredEditDraft}
              className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Live Autosave & Narrative Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {autosaveTime ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400/90 font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Autosaved {autosaveTime}
            </span>
          ) : isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-amber-400/80 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">Local autosave & crash recovery active</span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {wordCount} words · {charCount} chars · ~{readingTime} min read
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="dream-title" className="block text-xs font-semibold text-slate-300 mb-1.5">
          Dream Title <span className="text-blue-400">*</span>
        </label>
        <input
          id="dream-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Flight through the mountain pass"
          className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors font-medium"
          autoFocus={!isModal}
        />
      </div>

      {/* Lucidity Status (Three Segments) */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Lucidity Status <span className="text-blue-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setLucidity('non-lucid')}
            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors cursor-pointer ${
              lucidity === 'non-lucid'
                ? 'bg-slate-800 border-slate-600 text-slate-100'
                : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Non-Lucid</span>
              {lucidity === 'non-lucid' && <Check className="w-3.5 h-3.5 text-blue-400" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">Standard dream; unaware of dreaming state.</p>
          </button>

          <button
            type="button"
            onClick={() => setLucidity('lucid')}
            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors cursor-pointer ${
              lucidity === 'lucid'
                ? 'bg-blue-950/70 border-blue-500 text-blue-100'
                : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-300">
                Lucid Dream
              </span>
              {lucidity === 'lucid' && <Check className="w-3.5 h-3.5 text-blue-400" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">Consciously aware that I was dreaming while asleep.</p>
          </button>

          <button
            type="button"
            onClick={() => setLucidity('uncertain')}
            className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors cursor-pointer ${
              lucidity === 'uncertain'
                ? 'bg-amber-950/50 border-amber-500/80 text-amber-200'
                : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300">Uncertain / Pre-Lucid</span>
              {lucidity === 'uncertain' && <Check className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">Brief suspicion or fleeting doubt without control.</p>
          </button>
        </div>
      </div>

      {/* Date, Wake-up Time & Recall Quality Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Date */}
        <div>
          <label htmlFor="dream-date" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            Date of Dream
          </label>
          <input
            id="dream-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Wake-up Time */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="dream-time" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Approx. Wake-up Time
            </label>
            <span
              title={
                wakeConfig.isManualOverride
                  ? `Manually set wake-up time (${wakeConfig.timeZone})`
                  : `Current local time (${wakeConfig.timeZone})`
              }
              className="text-[10px] text-slate-400 font-normal flex items-center gap-1"
            >
              <Globe className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-[120px]">
                {wakeConfig.isManualOverride ? 'Manual' : 'Current Time'} ({wakeConfig.timeZone.split('/').pop()?.replace(/_/g, ' ') || wakeConfig.timeZone})
              </span>
            </span>
          </div>
          <input
            id="dream-time"
            type="time"
            value={wakeUpTime}
            onChange={(e) => handleWakeUpTimeChange(e.target.value)}
            placeholder="HH:mm"
            className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Recall Quality */}
        <div>
          <label htmlFor="dream-recall" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            Recall Quality
          </label>
          <select
            id="dream-recall"
            value={recallQuality}
            onChange={(e) => setRecallQuality(e.target.value as RecallQuality)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="dream-vividness" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Vividness Rating
          </label>
          <span className="text-xs font-medium text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40">
            {vividnessLabels[vividness]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setVividness(lvl)}
              className={`flex-1 py-1.5 px-1 rounded-lg border text-center transition-colors cursor-pointer ${
                vividness >= lvl
                  ? 'bg-amber-950/50 border-amber-600/60 text-amber-300 font-semibold'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
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
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="dream-narrative" className="text-xs font-semibold text-slate-300">
            Dream Narrative <span className="text-blue-400">*</span>
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
          className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm leading-relaxed focus:outline-none focus:border-blue-500 transition-colors font-sans"
        />
      </div>

      {/* Dream Signs Notes */}
      <div>
        <label htmlFor="dream-signs" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          Dream Signs & Lucidity Triggers (Optional)
        </label>
        <textarea
          id="dream-signs"
          value={dreamSignsNotes}
          onChange={(e) => setDreamSignsNotes(e.target.value)}
          placeholder="Note any dream signs: impossible physics, strange clocks/mirrors, breathing underwater, recurring people, or what triggered your lucidity."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs leading-relaxed focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Emotions Selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-blue-400" />
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
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950/70 text-blue-200 border-blue-500/60 font-medium'
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
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5 text-blue-400" />
          Tags & Categories
        </label>

        {/* Existing & Active tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200"
            >
              <span className="text-slate-400">#</span>
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-slate-400 hover:text-slate-100 cursor-pointer ml-1 text-xs font-bold"
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
            className="grow px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => handleAddTag()}>
            Add
          </Button>
        </div>

        {/* Quick Suggestions from DB */}
        {availableTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 items-center">
            <span className="text-[11px] text-slate-400 mr-1">Suggestions:</span>
            {availableTags
              .filter((t) => !tags.includes(t))
              .slice(0, 6)
              .map((suggested) => (
                <button
                  key={suggested}
                  type="button"
                  onClick={() => setTags((prev) => [...prev, suggested])}
                  className="text-[11px] text-slate-300 hover:text-blue-300 px-2 py-0.5 rounded bg-slate-900/60 hover:bg-slate-800 border border-slate-800 cursor-pointer"
                >
                  +{suggested}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* PHASE 2: Advanced Intelligence Collapsible Section */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-blue-400" />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Pattern & Lucidity Parameters
              </span>
              <span className="text-[11px] text-slate-400">
                False awakenings, dream control level, scene count, and interpretation
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
          <div className="mt-2.5 p-4 rounded-lg bg-slate-900/40 border border-slate-800 space-y-4">
            {/* False Awakening Checkbox & Details */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={falseAwakening}
                  onChange={(e) => setFalseAwakening(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
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
                      className="rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-blue-500"
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
                    <Brain className="w-3.5 h-3.5 text-blue-400" />
                    <span>Dream Control Level</span>
                  </label>
                  <span className="text-[11px] text-blue-300 font-medium">
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
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
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
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Remembered Scenes Count</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={scenes.length > 0 ? scenes.length : scenesCount}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setScenesCount(val);
                    }}
                    disabled={scenes.length > 0}
                    className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 font-mono disabled:opacity-60"
                  />
                  <span className="text-xs text-slate-400">
                    {scenes.length > 0 ? 'derived from structured scenes below' : 'distinct sequential scenes'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sequential Scenes Breakdown (Optional Structured Scenes) */}
            <div className="space-y-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Sequential Scene Breakdown
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Optionally segment dream into chronological scenes with individual lucidity & false awakening states.
                  </span>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={handleAddScene}
                  className="flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Scene</span>
                </Button>
              </div>

              {scenes.length > 0 && (
                <div className="space-y-3 pt-1">
                  {scenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 grow">
                          <span className="text-xs font-semibold text-blue-300 font-mono shrink-0">
                            Scene #{scene.sceneNumber}
                          </span>
                          <input
                            type="text"
                            value={scene.title || ''}
                            onChange={(e) => handleUpdateScene(scene.id, { title: e.target.value })}
                            placeholder="Optional scene title (e.g. Flight across canyon)"
                            className="w-full px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveScene(scene.id)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors cursor-pointer"
                          title="Remove scene"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        value={scene.narrative}
                        onChange={(e) => handleUpdateScene(scene.id, { narrative: e.target.value })}
                        placeholder="What happened in this specific scene?"
                        rows={2}
                        className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 leading-relaxed focus:outline-none focus:border-blue-500"
                      />

                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!scene.lucid}
                            onChange={(e) => handleUpdateScene(scene.id, { lucid: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700 w-3.5 h-3.5"
                          />
                          <span className="text-[11px]">Lucid during this scene</span>
                        </label>

                        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!scene.falseAwakening}
                            onChange={(e) => handleUpdateScene(scene.id, { falseAwakening: e.target.checked })}
                            className="rounded text-amber-600 focus:ring-amber-500 bg-slate-800 border-slate-700 w-3.5 h-3.5"
                          />
                          <span className="text-[11px]">False Awakening in this scene</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reality Checks that could have helped */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
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
                  className="grow px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-blue-500"
                />
                <Button type="button" size="sm" variant="secondary" onClick={() => handleAddRealityCheck()}>
                  Add Check
                </Button>
              </div>
            </div>

            {/* Personal Interpretation Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Personal Dream Meaning & Waking-Life Interpretation (Private):</span>
              </label>
              <textarea
                value={interpretationNotes}
                onChange={(e) => setInterpretationNotes(e.target.value)}
                placeholder="What personal significance, waking reflections, emotional symbols, or subconscious parallels do you associate with this dream?"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs leading-relaxed focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Connected Dreams (Continuations / Narrative Arcs) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Connected Dreams (Continuations & Recurring Themes):</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Link this dream to previous entries that share characters, narrative continuity, or identical settings.
              </p>

              {relatedDreamIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {relatedDreamIds.map((rId) => {
                    const match = availableDreamsForLinking.find((d) => d.id === rId);
                    return (
                      <span
                        key={rId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/60 border border-blue-800/60 text-xs text-blue-200"
                      >
                        <FileText className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">
                          {match ? match.title : `Dream ${rId.slice(0, 8)}`}
                        </span>
                        {match && (
                          <span className="text-[10px] text-blue-400 font-mono">({match.date})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setRelatedDreamIds((prev) => prev.filter((id) => id !== rId))}
                          className="text-blue-300 hover:text-white cursor-pointer ml-1 font-bold"
                          aria-label="Unlink dream"
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {availableDreamsForLinking.length > 0 ? (
                <div className="max-w-md">
                  <select
                    value=""
                    onChange={(e) => {
                      const selId = e.target.value;
                      if (selId && !relatedDreamIds.includes(selId)) {
                        setRelatedDreamIds((prev) => [...prev, selId]);
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">+ Link another dream to this entry...</option>
                    {availableDreamsForLinking
                      .filter((d) => !relatedDreamIds.includes(d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.date} — {d.title} ({d.lucidity})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic">No other dreams recorded yet to link.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-5 border-t border-slate-800">
        <div>
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={onDelete}
              disabled={isSaving}
            >
              Delete Entry
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Save Changes' : 'Record Dream'}
          </Button>
        </div>
      </div>
    </form>
  );
};

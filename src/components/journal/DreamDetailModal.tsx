import React, { useState, useEffect } from 'react';
import { DreamEntry, formatTechniqueDisplayName } from '../../types/dream';
import { Modal } from '../common/Modal';
import { LucidityBadge, EmotionBadge, TagBadge } from '../common/Badge';
import { formatFullDate, formatTime } from '../../utils/dateUtils';
import { Button } from '../common/Button';
import {
  Calendar,
  Clock,
  Star,
  Edit,
  Trash2,
  Compass,
  AlertTriangle,
  Brain,
  Shield,
  Layers,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Bookmark,
  FileText,
  Lock,
} from 'lucide-react';

interface DreamDetailModalProps {
  dream: DreamEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (dream: DreamEntry) => void;
  onDelete: (dream: DreamEntry) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onToggleFavorite?: (dream: DreamEntry) => void;
}

export const DreamDetailModal: React.FC<DreamDetailModalProps> = ({
  dream,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onToggleFavorite,
}) => {
  const [copied, setCopied] = useState(false);

  // Keyboard navigation for Previous / Next dream
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') return;

      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onPrev, onNext]);

  if (!dream) return null;

  const wordCount = dream.narrative ? dream.narrative.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleCopyMarkdown = async () => {
    const lines: string[] = [
      `# ${dream.title}`,
      `*Date: ${dream.date}${dream.wakeUpTime ? ` at ${dream.wakeUpTime}` : ''} | Lucidity: ${dream.lucidity} | Vividness: ${dream.vividness}/5*`,
      '',
      dream.narrative,
    ];

    if (dream.interpretationNotes) {
      lines.push('', '### Interpretation & Reflections', dream.interpretationNotes);
    }
    if (dream.dreamSignsNotes) {
      lines.push('', '### Dream Signs', dream.dreamSignsNotes);
    }
    if (dream.tags && dream.tags.length > 0) {
      lines.push('', `**Tags:** ${dream.tags.join(', ')}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-6">
        {/* Top Meta Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Prev / Next Chevrons */}
            {(onPrev || onNext) && (
              <div className="flex items-center gap-1 mr-1 border-r border-slate-800 pr-2">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Previous dream (ArrowLeft)"
                  aria-label="Previous dream"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Next dream (ArrowRight)"
                  aria-label="Next dream"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <LucidityBadge lucidity={dream.lucidity} size="md" />

            {dream.isPrivate && (
              <span className="inline-flex items-center gap-1 font-medium rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs px-2 py-0.5">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Private Vault</span>
              </span>
            )}

            {dream.falseAwakening && (
              <span className="inline-flex items-center gap-1 font-medium rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs px-2 py-0.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>False Awakening</span>
              </span>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatFullDate(dream.date)}</span>
            </div>
            {dream.wakeUpTime && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatTime(dream.wakeUpTime)}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            {onToggleFavorite && (
              <Button
                variant="secondary"
                size="sm"
                icon={
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      dream.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                    }`}
                  />
                }
                onClick={() => onToggleFavorite(dream)}
                title={dream.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
              >
                {dream.isFavorite ? 'Starred' : 'Star'}
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopyMarkdown}
              title="Copy dream as Markdown"
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Edit className="w-3.5 h-3.5" />}
              onClick={() => {
                onClose();
                onEdit(dream);
              }}
            >
              Edit
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => {
                onClose();
                onDelete(dream);
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight leading-snug">
            {dream.title}
          </h2>

          {/* Quality, Vividness & Reading Metrics bar */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Vividness:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <Star
                    key={lvl}
                    className={`w-3.5 h-3.5 ${
                      lvl <= dream.vividness
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-slate-300 ml-1 font-medium">({dream.vividness}/5)</span>
            </div>

            <div className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Recall:</span>
              <span className="text-slate-300 capitalize font-medium">{dream.recallQuality}</span>
            </div>

            {wordCount > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-slate-400">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>{wordCount} words · ~{readTimeMinutes}m read</span>
              </div>
            )}

            {typeof dream.dreamControl === 'number' && dream.dreamControl > 0 && (
              <div className="flex items-center gap-1 text-blue-300">
                <Brain className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-500">Control:</span>
                <span className="font-semibold">{dream.dreamControl}/5</span>
              </div>
            )}

            {dream.scenesCount && dream.scenesCount > 1 && (
              <div className="flex items-center gap-1 text-slate-400">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>{dream.scenesCount} scenes</span>
              </div>
            )}

            {dream.techniqueUsed && dream.techniqueUsed !== 'none' && (
              <div className="flex items-center gap-1.5 text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-md">
                <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-400">Technique:</span>
                <span className="font-semibold text-indigo-200">
                  {formatTechniqueDisplayName(dream.techniqueUsed, dream.customTechniqueUsed)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* False Awakening Box if recorded */}
        {dream.falseAwakening && dream.falseAwakeningDetails && (
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>False Awakening Incident</span>
            </div>
            {dream.falseAwakeningDetails.environmentDescription && (
              <p>
                <strong className="text-slate-400">Environment:</strong> {dream.falseAwakeningDetails.environmentDescription}
              </p>
            )}
            {dream.falseAwakeningDetails.triggerOrAnomaly && (
              <p>
                <strong className="text-slate-400">Trigger / Anomaly:</strong> {dream.falseAwakeningDetails.triggerOrAnomaly}
              </p>
            )}
            {dream.falseAwakeningDetails.realityCheckNotes && (
              <p>
                <strong className="text-slate-400">Reality Check:</strong> {dream.falseAwakeningDetails.realityCheckNotes}
              </p>
            )}
          </div>
        )}

        {/* Dream Signs Box if recorded */}
        {dream.dreamSignsNotes && (
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-medium text-blue-400 mb-1">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Dream Signs & Triggers</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">
              {dream.dreamSignsNotes}
            </p>
          </div>
        )}

        {/* Narrative (Clean long-text typography) */}
        <div
          className="text-slate-200 leading-relaxed space-y-4 whitespace-pre-wrap bg-slate-900/40 p-4 sm:p-5 rounded-lg border border-slate-800"
          style={{
            fontFamily: 'var(--font-narrative, inherit)',
            fontSize: 'var(--font-size-narrative, inherit)',
          }}
        >
          {dream.narrative}
        </div>

        {/* Multi-Scene Breakdown if recorded */}
        {dream.scenes && dream.scenes.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Sequential Scene Breakdown ({dream.scenes.length} Scenes)</span>
            </div>
            <div className="space-y-2">
              {dream.scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-300">
                        Scene {scene.sceneNumber}
                        {scene.title ? `: ${scene.title}` : ''}
                      </span>
                      {scene.lucid && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          Lucid
                        </span>
                      )}
                      {scene.falseAwakening && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          False Awakening
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {scene.narrative}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal Interpretation Notes if recorded */}
        {dream.interpretationNotes && (
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Personal Interpretation & Reflections</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">
              {dream.interpretationNotes}
            </p>
          </div>
        )}

        {/* Useful Reality Checks if recorded */}
        {dream.realityChecksUseful && dream.realityChecksUseful.length > 0 && (
          <div className="text-xs">
            <span className="text-slate-400 block mb-1.5 font-medium flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Actionable Reality Checks:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {dream.realityChecksUseful.map((rc) => (
                <span
                  key={rc}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                >
                  ✓ {rc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Emotions & Tags */}
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          {dream.emotions && dream.emotions.length > 0 && (
            <div>
              <span className="text-xs text-slate-400 block mb-1.5 font-medium">Emotional Tone:</span>
              <div className="flex flex-wrap gap-1.5">
                {dream.emotions.map((emotion) => (
                  <EmotionBadge key={emotion} emotion={emotion} />
                ))}
              </div>
            </div>
          )}

          {dream.tags && dream.tags.length > 0 && (
            <div>
              <span className="text-xs text-slate-400 block mb-1.5 font-medium">Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {dream.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
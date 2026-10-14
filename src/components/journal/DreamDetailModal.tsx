import React from 'react';
import { DreamEntry } from '../../types/dream';
import { Modal } from '../common/Modal';
import { LucidityBadge, EmotionBadge, TagBadge } from '../common/Badge';
import { formatFullDate, formatTime } from '../../utils/dateUtils';
import { Button } from '../common/Button';
import {
  Calendar,
  Clock,
  Star,
  Sparkles,
  Edit,
  Trash2,
  Compass,
  AlertTriangle,
  Brain,
  Shield,
  Layers,
  BookOpen,
} from 'lucide-react';

interface DreamDetailModalProps {
  dream: DreamEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (dream: DreamEntry) => void;
  onDelete: (dream: DreamEntry) => void;
}

export const DreamDetailModal: React.FC<DreamDetailModalProps> = ({
  dream,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!dream) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-6">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <LucidityBadge lucidity={dream.lucidity} size="md" />

            {dream.falseAwakening && (
              <span className="inline-flex items-center gap-1 font-semibold rounded-full bg-blue-950/80 text-blue-300 border border-blue-600/40 text-xs px-2.5 py-1">
                <AlertTriangle className="w-3 h-3 text-blue-400" />
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
          <div className="flex items-center gap-2">
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight leading-snug">
            {dream.title}
          </h2>

          {/* Quality & Vividness bar */}
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
          </div>
        </div>

        {/* False Awakening Box if recorded */}
        {dream.falseAwakening && dream.falseAwakeningDetails && (
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-blue-300">
              <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
              <span>False Awakening Incident</span>
            </div>
            {dream.falseAwakeningDetails.environmentDescription && (
              <p>
                <strong>Apparent Environment:</strong> {dream.falseAwakeningDetails.environmentDescription}
              </p>
            )}
            {dream.falseAwakeningDetails.triggerOrAnomaly && (
              <p>
                <strong>Trigger / Anomaly:</strong> {dream.falseAwakeningDetails.triggerOrAnomaly}
              </p>
            )}
            {dream.falseAwakeningDetails.realityCheckNotes && (
              <p>
                <strong>Reality Check:</strong> {dream.falseAwakeningDetails.realityCheckNotes}
              </p>
            )}
          </div>
        )}

        {/* Dream Signs Box if recorded */}
        {dream.dreamSignsNotes && (
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-300 mb-1">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Dream Signs & Lucidity Triggers</span>
            </div>
            <p className="leading-relaxed text-cyan-100/90 whitespace-pre-wrap">
              {dream.dreamSignsNotes}
            </p>
          </div>
        )}

        {/* Narrative (Clean long-text typography) */}
        <div className="text-slate-200 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-wrap font-sans bg-slate-900/40 p-5 rounded-xl border border-slate-800/60">
          {dream.narrative}
        </div>

        {/* Personal Interpretation Notes if recorded */}
        {dream.interpretationNotes && (
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200">
            <div className="flex items-center gap-1.5 font-semibold text-blue-300 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Personal Interpretation & Reflections</span>
            </div>
            <p className="leading-relaxed text-slate-300 whitespace-pre-wrap">
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

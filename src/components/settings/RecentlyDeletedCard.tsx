import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Calendar, Clock } from 'lucide-react';
import { dreamService } from '../../services/dreamService';
import { TrashedDream, TRASH_MAX_AGE_MS } from '../../utils/trashService';
import { DreamEntry } from '../../types/dream';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { LucidityBadge } from '../common/Badge';

interface RecentlyDeletedCardProps {
  onFeedback: (type: 'success' | 'error', text: string) => void;
}

function computeDaysRemaining(deletedAt: number, referenceTime: number): number {
  const elapsed = referenceTime - deletedAt;
  const remainingMs = Math.max(0, TRASH_MAX_AGE_MS - elapsed);
  return Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

export const RecentlyDeletedCard: React.FC<RecentlyDeletedCardProps> = ({ onFeedback }) => {
  const [trashedDreams, setTrashedDreams] = useState<TrashedDream[]>(() => dreamService.getTrash());
  const [dreamToPermanentlyDelete, setDreamToPermanentlyDelete] = useState<DreamEntry | null>(null);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [renderTimestamp] = useState(() => Date.now());

  const loadTrash = useCallback(() => {
    try {
      setTrashedDreams(dreamService.getTrash());
    } catch {
      setTrashedDreams([]);
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => loadTrash();
    window.addEventListener('oneiric:trash-changed', handleUpdate);
    window.addEventListener('oneiric:dream-saved', handleUpdate);

    return () => {
      window.removeEventListener('oneiric:trash-changed', handleUpdate);
      window.removeEventListener('oneiric:dream-saved', handleUpdate);
    };
  }, [loadTrash]);

  const handleRestore = async (id: string, title: string) => {
    try {
      setIsProcessing(true);
      const restored = await dreamService.restoreFromTrash(id);
      if (restored) {
        onFeedback('success', `Restored "${title}" to your journal.`);
      } else {
        onFeedback('error', `Could not restore "${title}".`);
      }
      loadTrash();
    } catch {
      onFeedback('error', `Failed to restore "${title}".`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!dreamToPermanentlyDelete) return;
    const { id, title } = dreamToPermanentlyDelete;
    try {
      setIsProcessing(true);
      dreamService.permanentlyDeleteFromTrash(id);
      setDreamToPermanentlyDelete(null);
      loadTrash();
      onFeedback('success', `"${title}" permanently deleted.`);
    } catch {
      onFeedback('error', `Failed to delete "${title}".`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEmptyTrash = async () => {
    try {
      setIsProcessing(true);
      dreamService.emptyTrash();
      setIsEmptyTrashConfirmOpen(false);
      loadTrash();
      onFeedback('success', 'Recently deleted dreams permanently cleared.');
    } catch {
      onFeedback('error', 'Failed to empty trash.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#101a38] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Recently Deleted</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {trashedDreams.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deleted dreams remain recoverable for 30 days before being automatically purged.
            </p>
          </div>
        </div>

        {trashedDreams.length > 0 && (
          <Button
            type="button"
            variant="danger"
            size="xs"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setIsEmptyTrashConfirmOpen(true)}
            disabled={isProcessing}
          >
            Empty Trash
          </Button>
        )}
      </div>

      {/* Content */}
      {trashedDreams.length === 0 ? (
        <div className="py-8 text-center text-slate-400 border border-dashed border-slate-800/80 rounded-lg bg-slate-900/20">
          <p className="text-xs text-slate-400 font-medium">Recently Deleted is empty</p>
          <p className="text-[11px] text-slate-500 mt-1">
            When you delete dreams, they will be kept here for 30 days before permanent deletion.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
          {trashedDreams.map(({ dream, deletedAt }) => {
            const daysLeft = computeDaysRemaining(deletedAt, renderTimestamp);
            const deletedDateFormatted = new Date(deletedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={dream.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100 text-sm truncate max-w-sm" title={dream.title}>
                      {dream.title || 'Untitled Dream'}
                    </span>
                    <LucidityBadge lucidity={dream.lucidity} size="sm" />
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                        daysLeft <= 3
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                      }`}
                    >
                      Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-400 text-[11px] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Recorded: {dream.date}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Deleted: {deletedDateFormatted}
                    </span>
                  </div>
                </div>

                {/* Row Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    icon={<RotateCcw className="w-3 h-3 text-blue-400" />}
                    onClick={() => handleRestore(dream.id, dream.title)}
                    disabled={isProcessing}
                  >
                    Restore
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="xs"
                    icon={<Trash2 className="w-3 h-3" />}
                    onClick={() => setDreamToPermanentlyDelete(dream)}
                    disabled={isProcessing}
                  >
                    Delete Permanently
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog: Permanent Delete Single Item */}
      <ConfirmDialog
        isOpen={Boolean(dreamToPermanentlyDelete)}
        onClose={() => setDreamToPermanentlyDelete(null)}
        onConfirm={handleConfirmPermanentDelete}
        title="Permanently Delete Dream"
        message={`Are you sure you want to permanently delete "${dreamToPermanentlyDelete?.title}"? This cannot be undone and cannot be recovered from trash.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isProcessing}
      />

      {/* Confirmation Dialog: Empty All Trash */}
      <ConfirmDialog
        isOpen={isEmptyTrashConfirmOpen}
        onClose={() => setIsEmptyTrashConfirmOpen(false)}
        onConfirm={handleConfirmEmptyTrash}
        title="Empty Recently Deleted"
        message={`Are you sure you want to permanently erase all ${trashedDreams.length} items from Recently Deleted? This operation cannot be reversed.`}
        confirmText="Empty Trash"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isProcessing}
      />
    </div>
  );
};

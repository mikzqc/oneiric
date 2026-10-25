import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, X, Check } from 'lucide-react';
import { dreamService } from '../../services/dreamService';
import { DreamEntry } from '../../types/dream';

export const UndoNotification: React.FC = () => {
  const [deletedDream, setDeletedDream] = useState<{ id: string; title: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleTrashed = (e: Event) => {
      const custom = e as CustomEvent<{ dream?: DreamEntry }>;
      if (custom.detail?.dream) {
        const dream = custom.detail.dream;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        setDeletedDream({
          id: dream.id,
          title: dream.title || 'Untitled Dream',
        });
        setIsRestored(false);
        setIsRestoring(false);

        // Auto-dismiss after approximately 6 seconds
        timerRef.current = setTimeout(() => {
          setDeletedDream(null);
        }, 6000);
      }
    };

    window.addEventListener('oneiric:dream-trashed', handleTrashed);
    return () => {
      window.removeEventListener('oneiric:dream-trashed', handleTrashed);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleUndo = async () => {
    if (!deletedDream || isRestoring) return;
    const dreamId = deletedDream.id;
    setIsRestoring(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    try {
      const restored = await dreamService.restoreFromTrash(dreamId);
      if (restored) {
        setIsRestored(true);
        timerRef.current = setTimeout(() => {
          setDeletedDream(null);
          setIsRestored(false);
          setIsRestoring(false);
        }, 1800);
      } else {
        setDeletedDream(null);
        setIsRestoring(false);
      }
    } catch {
      setDeletedDream(null);
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setDeletedDream(null);
    setIsRestored(false);
    setIsRestoring(false);
  };

  if (!deletedDream) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-[#101a38] border border-slate-700/80 rounded-lg shadow-xl px-4 py-3 text-xs text-slate-200 animate-fadeIn max-w-sm"
    >
      {isRestored ? (
        <>
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-emerald-300">Dream restored to journal</span>
        </>
      ) : (
        <>
          <RotateCcw className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="truncate max-w-[200px]" title={deletedDream.title}>
            Deleted "{deletedDream.title}"
          </span>
          <button
            type="button"
            onClick={handleUndo}
            disabled={isRestoring}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs border border-blue-500/60 transition-colors cursor-pointer shrink-0 ml-auto focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isRestoring ? 'Restoring...' : 'Undo'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

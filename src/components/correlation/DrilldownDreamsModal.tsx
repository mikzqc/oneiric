import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DreamEntry } from '../../types/dream';
import { db } from '../../db/database';
import { Eye, Calendar, ExternalLink } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

interface DrilldownDreamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  dreamIds: string[];
  onOpenDream?: (dream: DreamEntry) => void;
}

export const DrilldownDreamsModal: React.FC<DrilldownDreamsModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  dreamIds,
  onOpenDream,
}) => {
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [loadedForIds, setLoadedForIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || dreamIds.length === 0) {
      return;
    }

    let isMounted = true;

    db.dreams
      .where('id')
      .anyOf(dreamIds)
      .toArray()
      .then((records) => {
        if (isMounted) {
          // Sort by date descending
          records.sort((a, b) => b.date.localeCompare(a.date));
          setDreams(records);
          setLoadedForIds(dreamIds);
        }
      })
      .catch(() => {
        if (isMounted) setLoadedForIds(dreamIds);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, dreamIds]);

  const isLoading = isOpen && dreamIds.length > 0 && loadedForIds !== dreamIds;

  const getLucidityBadge = (lucidity: string) => {
    if (lucidity === 'lucid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-700/50">
          <Eye className="w-3 h-3 text-blue-400" />
          Lucid
        </span>
      );
    }
    if (lucidity === 'uncertain') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/50">
          Uncertain
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
        Non-Lucid
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      <div className="space-y-4 max-h-[70vh] flex flex-col">
        {/* Header subtitle */}
        <div className="text-xs text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
          <span>{subtitle}</span>
          <span className="font-mono text-slate-300">{dreams.length} distinct {dreams.length === 1 ? 'dream' : 'dreams'}</span>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          ) : dreams.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching dream entries found in the database.
            </div>
          ) : (
            dreams.map((dream) => (
              <div
                key={dream.id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                      {dream.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(dream.date)}
                      </span>
                      <span>Vividness: {dream.vividness}/5</span>
                      {typeof dream.dreamControl === 'number' && (
                        <span>Control: {dream.dreamControl}/5</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getLucidityBadge(dream.lucidity)}
                    {dream.falseAwakening && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/50">
                        FA
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {dream.narrative}
                </p>

                {onOpenDream && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDream(dream);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <span>View Journal Entry</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

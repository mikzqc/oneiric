import React from 'react';
import { DreamEntry } from '../../types/dream';
import { LucidityBadge, EmotionBadge, TagBadge } from '../common/Badge';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Star, Clock, Calendar, Eye, Edit, Trash2 } from 'lucide-react';
import { SearchMatchDetail } from '../../services/searchService';

interface DreamCardProps {
  dream: DreamEntry;
  onView: (dream: DreamEntry) => void;
  onEdit: (dream: DreamEntry) => void;
  onDelete: (dream: DreamEntry) => void;
  matchDetails?: SearchMatchDetail[];
}

export const DreamCard: React.FC<DreamCardProps> = ({
  dream,
  onView,
  onEdit,
  onDelete,
  matchDetails,
}) => {
  const isLucid = dream.lucidity === 'lucid';

  return (
    <article
      onClick={() => onView(dream)}
      className={`group relative p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
        isLucid
          ? 'bg-[#0f172a]/80 hover:bg-[#131d36] border-slate-800 hover:border-slate-700 border-l-2 border-l-sky-500'
          : 'bg-[#0f172a]/60 hover:bg-[#121a30] border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div>
        {/* Top Meta Line */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <LucidityBadge lucidity={dream.lucidity} size="sm" />
            {dream.falseAwakening && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/50">
                FA
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{formatDate(dream.date)}</span>
            </div>
            {dream.wakeUpTime && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{formatTime(dream.wakeUpTime)}</span>
              </div>
            )}
          </div>

          {/* Vividness Rating */}
          <div className="flex items-center gap-0.5" title={`Vividness: ${dream.vividness}/5`}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <Star
                key={lvl}
                className={`w-3 h-3 ${
                  lvl <= dream.vividness
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-blue-300 transition-colors line-clamp-1 mb-1.5">
          {dream.title}
        </h3>

        {/* Narrative Excerpt */}
        <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed mb-3 font-normal">
          {dream.narrative}
        </p>

        {/* Dream sign indicator if exists */}
        {dream.dreamSignsNotes && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 line-clamp-1">
            <span className="text-blue-400 font-medium">Sign:</span>
            <span className="truncate">{dream.dreamSignsNotes}</span>
          </div>
        )}

        {/* Deep Content Search Match Reason if searching */}
        {matchDetails && matchDetails.length > 0 && (
          <div className="mb-2.5 flex items-center gap-1.5 text-[10px] text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50 line-clamp-1 font-mono">
            <span className="text-blue-400 font-semibold shrink-0">Match:</span>
            <span className="truncate">{matchDetails.map((m) => m.label).join(' · ')}</span>
          </div>
        )}
      </div>

      {/* Footer Tags & Actions */}
      <div className="pt-2.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2">
        {/* Emotions & Tags preview */}
        <div className="flex flex-wrap items-center gap-1 max-w-[70%] overflow-hidden">
          {dream.emotions && dream.emotions.slice(0, 2).map((emotion) => (
            <EmotionBadge key={emotion} emotion={emotion} size="sm" />
          ))}
          {dream.tags && dream.tags.slice(0, 2).map((tag) => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
          {((dream.emotions?.length || 0) + (dream.tags?.length || 0) > 4) && (
            <span className="text-[10px] text-slate-500 font-medium">
              +{((dream.emotions?.length || 0) + (dream.tags?.length || 0)) - 4}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div
          className="flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onView(dream)}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition-colors"
            title="Inspect Dream"
            aria-label={`View details of ${dream.title}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(dream)}
            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-md hover:bg-slate-800 transition-colors"
            title="Edit Dream"
            aria-label={`Edit ${dream.title}`}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(dream)}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors"
            title="Delete Dream"
            aria-label={`Delete ${dream.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

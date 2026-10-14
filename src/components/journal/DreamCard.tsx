import React from 'react';
import { DreamEntry } from '../../types/dream';
import { LucidityBadge, EmotionBadge, TagBadge } from '../common/Badge';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { Star, Clock, Calendar, Eye, Edit, Trash2, Sparkles } from 'lucide-react';

interface DreamCardProps {
  dream: DreamEntry;
  onView: (dream: DreamEntry) => void;
  onEdit: (dream: DreamEntry) => void;
  onDelete: (dream: DreamEntry) => void;
}

export const DreamCard: React.FC<DreamCardProps> = ({
  dream,
  onView,
  onEdit,
  onDelete,
}) => {
  const isLucid = dream.lucidity === 'lucid';

  return (
    <article
      onClick={() => onView(dream)}
      className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isLucid
          ? 'bg-[#0f172a]/90 hover:bg-[#131d36] border-cyan-500/30 hover:border-cyan-400/50 shadow-lg shadow-cyan-950/20 lucid-glow'
          : 'bg-[#0f172a]/60 hover:bg-[#141e34] border-slate-800/80 hover:border-slate-700/80 shadow-md shadow-black/40'
      }`}
    >
      <div>
        {/* Top Meta Line */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <LucidityBadge lucidity={dream.lucidity} size="sm" />
            {dream.falseAwakening && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-700/50">
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
          <div className="flex items-center gap-0.5">
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
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-200 transition-colors line-clamp-1 mb-2">
          {dream.title}
        </h3>

        {/* Narrative Excerpt */}
        <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed mb-4 font-normal">
          {dream.narrative}
        </p>

        {/* Dream sign indicator if exists */}
        {dream.dreamSignsNotes && (
          <div className="mb-3 flex items-center gap-1.5 text-[11px] text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-800/40 line-clamp-1">
            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">{dream.dreamSignsNotes}</span>
          </div>
        )}
      </div>

      {/* Footer Tags & Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        {/* Emotions & Tags preview */}
        <div className="flex flex-wrap items-center gap-1.5 max-w-[70%] overflow-hidden">
          {dream.emotions && dream.emotions.slice(0, 2).map((emotion) => (
            <EmotionBadge key={emotion} emotion={emotion} size="sm" />
          ))}
          {dream.tags && dream.tags.slice(0, 2).map((tag) => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
          {((dream.emotions?.length || 0) + (dream.tags?.length || 0) > 4) && (
            <span className="text-[10px] text-slate-400 font-medium">
              +{((dream.emotions?.length || 0) + (dream.tags?.length || 0)) - 4}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div
          className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onView(dream)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Read entry"
            aria-label="Read dream entry"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(dream)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Edit entry"
            aria-label="Edit dream entry"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(dream)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Delete entry"
            aria-label="Delete dream entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

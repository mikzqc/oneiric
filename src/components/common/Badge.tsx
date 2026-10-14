import React from 'react';
import { LucidityLevel } from '../../types/dream';
import { Sparkles, Eye, HelpCircle } from 'lucide-react';

interface LucidityBadgeProps {
  lucidity: LucidityLevel;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const LucidityBadge: React.FC<LucidityBadgeProps> = ({
  lucidity,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  if (lucidity === 'lucid') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-900/30 lucid-glow ${sizeClasses} ${className}`}
      >
        {showIcon && <Sparkles className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />}
        <span>Lucid</span>
      </span>
    );
  }

  if (lucidity === 'uncertain') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-950/60 text-amber-300 border border-amber-600/30 ${sizeClasses} ${className}`}
      >
        {showIcon && <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />}
        <span>Uncertain</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 ${sizeClasses} ${className}`}
    >
      {showIcon && <Eye className="w-3 h-3 text-slate-400 shrink-0" />}
      <span>Non-Lucid</span>
    </span>
  );
};

export const EmotionBadge: React.FC<{ emotion: string; size?: 'sm' | 'md'; onRemove?: () => void }> = ({
  emotion,
  size = 'sm',
  onRemove,
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-indigo-950/50 text-indigo-200 border border-indigo-800/40 ${sizeClasses}`}
    >
      <span>{emotion}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-indigo-400 hover:text-indigo-200 ml-0.5 cursor-pointer"
          aria-label={`Remove emotion ${emotion}`}
        >
          &times;
        </button>
      )}
    </span>
  );
};

export const TagBadge: React.FC<{ tag: string; size?: 'sm' | 'md'; onRemove?: () => void; onClick?: () => void }> = ({
  tag,
  size = 'sm',
  onRemove,
  onClick,
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:bg-slate-700/80 hover:text-white' : ''
      }`}
    >
      <span className="text-slate-500">#</span>
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-slate-400 hover:text-slate-200 ml-0.5 cursor-pointer"
          aria-label={`Remove tag ${tag}`}
        >
          &times;
        </button>
      )}
    </span>
  );
};

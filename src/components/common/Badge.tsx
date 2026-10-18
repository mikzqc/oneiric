import React from 'react';
import { LucidityLevel } from '../../types/dream';
import { Eye, HelpCircle } from 'lucide-react';

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
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';

  if (lucidity === 'lucid') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-sky-950/70 text-sky-300 border border-sky-700/60 ${sizeClasses} ${className}`}
      >
        {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
        <span>Lucid</span>
      </span>
    );
  }

  if (lucidity === 'uncertain') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-amber-950/50 text-amber-300 border border-amber-700/60 ${sizeClasses} ${className}`}
      >
        {showIcon && <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />}
        <span>Uncertain</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md bg-slate-800/80 text-slate-300 border border-slate-700 ${sizeClasses} ${className}`}
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
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700/80 ${sizeClasses}`}
    >
      <span>{emotion}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-slate-400 hover:text-slate-100 ml-0.5 cursor-pointer"
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
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md bg-slate-900/90 text-slate-300 border border-slate-800 ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:bg-slate-800 hover:text-slate-100' : ''
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
          className="text-slate-400 hover:text-slate-100 ml-0.5 cursor-pointer"
          aria-label={`Remove tag ${tag}`}
        >
          &times;
        </button>
      )}
    </span>
  );
};

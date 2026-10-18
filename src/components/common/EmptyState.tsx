import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-slate-800 bg-[#0f172a]/40 ${className}`}
    >
      <div className="w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-3.5">
        {icon || <BookOpen className="w-5 h-5" />}
      </div>

      <h3 className="text-sm font-semibold text-slate-200 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-5">{description}</p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {actionText && onAction && (
            <Button size="sm" variant="primary" onClick={onAction}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button size="sm" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

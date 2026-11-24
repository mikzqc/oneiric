import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Trash2, AlertCircle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  requiredTypedText?: string;
  isLoading?: boolean;
}

function formatMessage(message: string): React.ReactNode {
  const parts = message.split(/(".*?")/);
  if (parts.length === 1) return message;
  return parts.map((part, i) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <span key={i} className="text-slate-200 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  requiredTypedText,
  isLoading = false,
}) => {
  const [typedInput, setTypedInput] = useState('');

  const isDestructiveAction =
    isDestructive ||
    /delete|remove|clear|purge|erase/i.test(title) ||
    /delete|remove/i.test(confirmText);

  const canConfirm = !requiredTypedText || typedInput.trim() === requiredTypedText;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm();
    setTypedInput('');
  };

  const handleClose = useCallback(() => {
    setTypedInput('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const dialogNode = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Dim Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-backdrop transition-opacity duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Unified Dialog Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-10 overflow-hidden my-auto p-5 sm:p-6 animate-modal">
        {/* Unobtrusive Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Row: Icon Badge + Text */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isDestructiveAction
                ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                : 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
            }`}
          >
            {isDestructiveAction ? (
              <Trash2 className="w-5 h-5 text-rose-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-blue-400" />
            )}
          </div>

          <div className="grow min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold text-slate-100 tracking-tight leading-snug"
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-message"
              className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed"
            >
              {formatMessage(message)}
            </p>

            {requiredTypedText && (
              <div className="mt-3.5 pt-3 border-t border-slate-800/60">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  Type{' '}
                  <span className="font-mono text-rose-300 bg-rose-950/60 px-1 py-0.5 rounded border border-rose-900/60">
                    {requiredTypedText}
                  </span>{' '}
                  to confirm:
                </label>
                <input
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder={requiredTypedText}
                  className="w-full px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-1">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructiveAction ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            isLoading={isLoading}
            icon={isDestructiveAction ? <Trash2 className="w-3.5 h-3.5" /> : undefined}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialogNode, document.body) : dialogNode;
};

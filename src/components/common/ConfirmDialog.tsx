import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle } from 'lucide-react';

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

  const canConfirm = !requiredTypedText || typedInput.trim() === requiredTypedText;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm();
    setTypedInput('');
  };

  const handleClose = () => {
    setTypedInput('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="md">
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            isDestructive
              ? 'bg-red-950/60 text-red-400 border border-red-800/50'
              : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/50'
          }`}
        >
          {isDestructive ? <AlertTriangle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <div className="grow">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{message}</p>

          {requiredTypedText && (
            <div className="mt-4">
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Type <span className="font-mono text-red-300 bg-red-950/60 px-1 py-0.5 rounded border border-red-900/60">{requiredTypedText}</span> to confirm:
              </label>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={requiredTypedText}
                className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800/80">
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={isDestructive ? 'danger' : 'primary'}
          onClick={handleConfirm}
          disabled={!canConfirm || isLoading}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

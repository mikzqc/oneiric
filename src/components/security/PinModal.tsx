import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { securityService } from '../../services/securityService';
import { Lock, AlertCircle, Check } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'set' | 'change' | 'verify' | 'remove';
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isChanging = mode === 'change';
  const isSetting = mode === 'set';
  const isRemoving = mode === 'remove';
  const isVerifying = mode === 'verify';

  const resetForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSetting) {
        if (newPin.length < 4) {
          throw new Error('PIN must be at least 4 digits.');
        }
        if (newPin !== confirmPin) {
          throw new Error('PINs do not match. Please verify.');
        }
        await securityService.setPin(newPin);
      } else if (isChanging) {
        const verified = await securityService.unlockWithPin(currentPin);
        if (!verified) {
          throw new Error('Current PIN is incorrect.');
        }
        if (newPin.length < 4) {
          throw new Error('New PIN must be at least 4 digits.');
        }
        if (newPin !== confirmPin) {
          throw new Error('New PINs do not match.');
        }
        await securityService.setPin(newPin);
      } else if (isRemoving) {
        await securityService.removePin(currentPin);
      } else if (isVerifying) {
        const verified = await securityService.unlockWithPin(currentPin);
        if (!verified) {
          throw new Error('Incorrect PIN.');
        }
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (isSetting) return 'Set Security PIN & Encrypt Vault';
    if (isChanging) return 'Change Security PIN';
    if (isRemoving) return 'Remove PIN & Disable App Lock';
    return 'Enter Security PIN';
  };

  const getSubtitle = () => {
    if (isSetting) {
      return 'Your PIN derives a local AES-256-GCM key to protect your private dreams and sync credentials.';
    }
    if (isChanging) return 'Enter your current PIN, then choose a new one.';
    if (isRemoving) return 'Enter your current PIN to confirm removal.';
    return 'Verify your PIN to continue.';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{getTitle()}</h3>
            <p className="text-[11px] text-slate-400">{getSubtitle()}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current PIN field when changing or removing or verifying */}
        {(isChanging || isRemoving || isVerifying) && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Current PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-600 text-sm font-mono tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
        )}

        {/* New PIN fields when setting or changing */}
        {(isSetting || isChanging) && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isChanging ? 'New PIN (4+ digits)' : 'Security PIN (4+ digits)'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                autoFocus={isSetting}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-600 text-sm font-mono tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-600 text-sm font-mono tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={isRemoving ? 'danger' : 'primary'}
            size="sm"
            isLoading={isLoading}
            icon={isRemoving ? undefined : <Check className="w-3.5 h-3.5" />}
          >
            {isSetting ? 'Save PIN' : isChanging ? 'Update PIN' : isRemoving ? 'Remove PIN' : 'Verify'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

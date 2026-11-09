import React, { useState, useEffect, useRef, useCallback } from 'react';
import { securityService } from '../../services/securityService';
import { Lock, Fingerprint, Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

export const AppLockScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = securityService.getConfig();

  const handleBiometricUnlock = useCallback(async () => {
    setError(null);
    try {
      await securityService.unlockWithBiometrics();
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    if (config.biometricEnabled) {
      securityService.isBiometricAvailable().then((avail) => {
        setCanUseBiometrics(avail);
        if (avail) {
          handleBiometricUnlock();
        }
      });
    }
  }, [config.biometricEnabled, handleBiometricUnlock]);

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;

    setError(null);
    setIsUnlocking(true);
    try {
      const success = await securityService.unlockWithPin(pin);
      if (!success) {
        setError('Incorrect PIN. Please try again.');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Decryption failed. Please try again.');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#0b132b] text-slate-100 flex flex-col items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Oneiric App Lock"
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* App Logo & Lock Badge */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-3 shadow-xl">
            <img src="/logo.png" alt="Oneiric Logo" className="w-full h-full object-contain" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 border-2 border-[#0b132b] flex items-center justify-center text-white shadow-sm">
            <Lock className="w-3 h-3" />
          </div>
        </div>

        {/* Brand & Security Title */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Oneiric Locked</h1>
          <p className="text-xs text-slate-400">
            Enter your secret PIN to decrypt your encryption key and access your journal.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200 text-left animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Input Form */}
        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handlePinSubmit();
            }
          }}
          className="w-full space-y-4"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              name="oneiric-lock-code"
              id="oneiric-lock-code"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter PIN"
              autoFocus
              className="w-full text-center tracking-[0.5em] text-lg font-mono px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => handlePinSubmit()}
              variant="primary"
              size="md"
              className="w-full justify-center"
              isLoading={isUnlocking}
              disabled={!pin}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Unlock Oneiric
            </Button>

            {canUseBiometrics && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleBiometricUnlock}
                className="w-full justify-center"
                icon={<Fingerprint className="w-4 h-4 text-blue-400" />}
              >
                Use Biometrics (Touch ID / Windows Hello)
              </Button>
            )}
          </div>
        </div>

        {/* Cryptographic Protection Guarantee */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span>Hardware-derived AES-256-GCM encryption</span>
        </div>
      </div>
    </div>
  );
};

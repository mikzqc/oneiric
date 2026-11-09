import React, { useState, useEffect } from 'react';
import { securityService, SecurityConfig } from '../../services/securityService';
import { Button } from '../common/Button';
import { PinModal } from '../security/PinModal';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Fingerprint,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const SecuritySettingsCard: React.FC = () => {
  const [config, setConfig] = useState<SecurityConfig>(securityService.getConfig());
  const [modalMode, setModalMode] = useState<'set' | 'change' | 'remove' | null>(null);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setConfig(securityService.getConfig());
    };
    const unsubscribe = securityService.subscribe(update);
    securityService.isBiometricAvailable().then(setCanUseBiometrics);
    return () => unsubscribe();
  }, []);

  const handleToggleAutoLock = () => {
    securityService.setAutoLockOnBlur(!config.autoLockOnBlur);
  };

  const handleToggleAppLock = () => {
    if (!config.hasPin) {
      setModalMode('set');
    } else {
      securityService.setAppLockEnabled(!config.isAppLockEnabled);
    }
  };

  const handleToggleBiometrics = async () => {
    setBioError(null);
    if (config.biometricEnabled) {
      securityService.disableBiometrics();
    } else {
      try {
        await securityService.enableBiometrics();
      } catch (err) {
        setBioError(err instanceof Error ? err.message : 'Failed to register biometric');
      }
    }
  };

  const handleLockNow = () => {
    securityService.lock();
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#0f172a]/70 border border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>App Lock & Cryptographic Vault</span>
              {config.hasPin && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Protected
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Derives local AES-256-GCM encryption keys to protect confidential dreams and sync credentials.
            </p>
          </div>
        </div>

        {config.hasPin && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Lock className="w-3.5 h-3.5 text-amber-400" />}
              onClick={handleLockNow}
            >
              Lock App Now
            </Button>
          </div>
        )}
      </div>

      {bioError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{bioError}</span>
        </div>
      )}

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Security PIN status */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                Security PIN
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {config.hasPin ? '••••' : 'Not set'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your PIN protects access to your private dreams and encrypts your sync encryption key.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {!config.hasPin ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModalMode('set')}
                icon={<Lock className="w-3.5 h-3.5" />}
              >
                Set Security PIN
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalMode('change')}
                >
                  Change PIN
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalMode('remove')}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove PIN
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Require PIN on Launch */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                App Lock on Launch
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  config.isAppLockEnabled && config.hasPin
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {config.isAppLockEnabled && config.hasPin ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Shields the entire application with a lock screen when opening Oneiric. Prevents previews.
            </p>
          </div>

          <div>
            <Button
              variant={config.isAppLockEnabled && config.hasPin ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleToggleAppLock}
              disabled={!config.hasPin}
              icon={config.isAppLockEnabled && config.hasPin ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            >
              {config.isAppLockEnabled && config.hasPin ? 'Disable App Lock' : 'Enable App Lock'}
            </Button>
          </div>
        </div>

        {/* Auto-Lock on Window Blur / Tab Switch */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-blue-400" />
                Auto-Lock on Blur
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  config.autoLockOnBlur && config.hasPin
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {config.autoLockOnBlur && config.hasPin ? 'Active' : 'Off'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automatically locks the app and wipes memory keys whenever Oneiric loses window focus or switching tabs.
            </p>
          </div>

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleAutoLock}
              disabled={!config.hasPin}
            >
              {config.autoLockOnBlur && config.hasPin ? 'Turn Off Auto-Lock' : 'Turn On Auto-Lock'}
            </Button>
          </div>
        </div>

        {/* Biometric Unlock */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
                Biometric Unlock
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  config.biometricEnabled
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {config.biometricEnabled ? 'Configured' : canUseBiometrics ? 'Available' : 'Unsupported'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use Windows Hello, Touch ID, or device biometric sensors to quickly unlock your private dreams.
            </p>
          </div>

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleBiometrics}
              disabled={!config.hasPin || (!canUseBiometrics && !config.biometricEnabled)}
              icon={<Fingerprint className="w-3.5 h-3.5 text-blue-400" />}
            >
              {config.biometricEnabled ? 'Disable Biometrics' : 'Enable Biometrics'}
            </Button>
          </div>
        </div>
      </div>

      {modalMode && (
        <PinModal
          isOpen={true}
          onClose={() => setModalMode(null)}
          onSuccess={() => setConfig(securityService.getConfig())}
          mode={modalMode}
        />
      )}
    </div>
  );
};

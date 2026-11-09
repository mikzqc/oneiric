import React, { useState, useEffect } from 'react';
import { dreamService } from '../services/dreamService';
import { securityService } from '../services/securityService';
import { DreamEntry } from '../types/dream';
import { DreamCard } from '../components/journal/DreamCard';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { PinModal } from '../components/security/PinModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import {
  Lock,
  Unlock,
  Plus,
  Shield,
  Fingerprint,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

interface PrivateVaultPageProps {
  onOpenNewDream: () => void;
  onEditDream: (dream: DreamEntry) => void;
}

export const PrivateVaultPage: React.FC<PrivateVaultPageProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const [privateDreams, setPrivateDreams] = useState<DreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(securityService.isVaultUnlocked());
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);
  const [dreamToDelete, setDreamToDelete] = useState<DreamEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const config = securityService.getConfig();

  const loadVaultDreams = async () => {
    try {
      setIsLoading(true);
      const dreams = await dreamService.getPrivateDreams();
      setPrivateDreams(dreams);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkSecurity = () => {
      const unlocked = securityService.isVaultUnlocked();
      setIsUnlocked(unlocked);
      if (unlocked) {
        loadVaultDreams();
      }
    };

    checkSecurity();
    const unsubscribe = securityService.subscribe(checkSecurity);

    const handleAutoLock = () => {
      securityService.lockVault();
    };

    window.addEventListener('beforeunload', handleAutoLock);
    window.addEventListener('pagehide', handleAutoLock);
    window.addEventListener('oneiric:dream-saved', loadVaultDreams);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleAutoLock);
      window.removeEventListener('pagehide', handleAutoLock);
      window.removeEventListener('oneiric:dream-saved', loadVaultDreams);
    };
  }, []);

  const handleUnlockWithPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError(null);
    if (!pinInput) return;

    const success = await securityService.unlockVaultWithPin(pinInput);
    if (success) {
      setPinInput('');
      setIsUnlocked(true);
      await loadVaultDreams();
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  const handleBiometricUnlock = async () => {
    setPinError(null);
    const success = await securityService.unlockVaultWithBiometrics();
    if (success) {
      setIsUnlocked(true);
      await loadVaultDreams();
    }
  };

  const handleLockVault = () => {
    securityService.lockVault();
    setIsUnlocked(false);
  };

  const handleDeleteConfirm = async () => {
    if (!dreamToDelete) return;
    try {
      setIsDeleting(true);
      await dreamService.deleteDream(dreamToDelete.id);
      setDreamToDelete(null);
      await loadVaultDreams();
    } finally {
      setIsDeleting(false);
    }
  };

  // If user has not set a PIN yet, prompt them to set one
  if (!config.hasPin) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto py-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-blue-400">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Setup Private Vault</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Protect sensitive dreams behind an authenticated AES-256-GCM encryption key. Private dreams stay hidden from the main journal and require your PIN to unlock.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="md"
            icon={<KeyRound className="w-4 h-4" />}
            onClick={() => setIsPinModalOpen(true)}
          >
            Create Security PIN
          </Button>
        </div>

        <PinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsUnlocked(true);
            loadVaultDreams();
          }}
          mode="set"
        />
      </div>
    );
  }

  // Vault is locked: render the unlock gate
  if (!isUnlocked) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-md mx-auto py-12 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-center mx-auto text-blue-400 shadow-md">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold tracking-tight text-slate-100">Private Vault Locked</h1>
          <p className="text-xs text-slate-400">
            Enter your PIN to decrypt and access your private dream records.
          </p>
        </div>

        {pinError && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200 text-left">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{pinError}</span>
          </div>
        )}

        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleUnlockWithPin();
            }
          }}
          className="space-y-3"
        >
          <input
            type="password"
            inputMode="numeric"
            name="oneiric-vault-code"
            id="oneiric-vault-code"
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              if (pinError) setPinError(null);
            }}
            placeholder="••••"
            autoFocus
            className="w-full text-center tracking-[0.5em] text-lg font-mono px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => handleUnlockWithPin()}
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={!pinInput}
              icon={<Unlock className="w-4 h-4" />}
            >
              Unlock Vault
            </Button>

            {config.biometricEnabled && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleBiometricUnlock}
                className="w-full justify-center"
                icon={<Fingerprint className="w-4 h-4 text-blue-400" />}
              >
                Use Biometrics
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vault is unlocked: render private dreams workbench
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Vault Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100 tracking-tight flex items-center gap-2">
              <span>Private Vault</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                Unlocked
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {privateDreams.length} {privateDreams.length === 1 ? 'private entry' : 'private entries'} hidden from normal journal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Lock className="w-3.5 h-3.5 text-amber-400" />}
            onClick={handleLockVault}
            title="Lock Vault immediately"
          >
            Lock Vault
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={onOpenNewDream}
          >
            Record Private Dream
          </Button>
        </div>
      </div>

      {/* Private Dreams Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : privateDreams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {privateDreams.map((dream, idx) => (
            <DreamCard
              key={dream.id}
              dream={dream}
              index={idx}
              onView={setSelectedDreamForView}
              onEdit={onEditDream}
              onDelete={setDreamToDelete}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Lock className="w-7 h-7 text-blue-400" />}
          title="Your Private Vault is Empty"
          description="You can mark any dream as private in the dream editor. Private dreams stay hidden from the normal journal and require your PIN to view."
          actionText="Record a Private Dream"
          onAction={onOpenNewDream}
        />
      )}

      {/* Detail Modal */}
      <DreamDetailModal
        dream={selectedDreamForView}
        isOpen={!!selectedDreamForView}
        onClose={() => setSelectedDreamForView(null)}
        onEdit={(d) => {
          setSelectedDreamForView(null);
          onEditDream(d);
        }}
        onDelete={(d) => {
          setSelectedDreamForView(null);
          setDreamToDelete(d);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!dreamToDelete}
        onClose={() => setDreamToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Permanently Delete Private Dream"
        message={`Are you sure you want to delete "${dreamToDelete?.title}" from your encrypted vault? This cannot be undone.`}
        confirmText="Delete Dream"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/database';
import { backupService } from '../services/backupService';
import { cryptoService } from '../services/cryptoService';
import { celebrationService } from '../services/celebrationService';
import { wakeTimeService, WakeTimeConfig, WAKE_TIME_CHANGED_EVENT } from '../services/wakeTimeService';
import { ImportValidationResult } from '../types/backup';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import {
  Download,
  Upload,
  Trash2,
  Database,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  Key,
  Eye,
  EyeOff,
  Clock,
  Globe,
} from 'lucide-react';
import { SyncSettingsCard } from '../components/sync/SyncSettingsCard';

export const SettingsPage: React.FC = () => {
  const [hasSample, setHasSample] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Local Time Zone & Wake-Up Schedule State
  const [wakeConfig, setWakeConfig] = useState<WakeTimeConfig>(() =>
    wakeTimeService.getWakeTimeConfig()
  );
  const [isRefreshingTz, setIsRefreshingTz] = useState(false);

  // Subsequent lucid dream celebrations toggle
  const [subsequentCelebrationEnabled, setSubsequentCelebrationEnabled] = useState(() =>
    celebrationService.isSubsequentCelebrationEnabled()
  );

  useEffect(() => {
    const handleWakeChange = (e: Event) => {
      const custom = e as CustomEvent<WakeTimeConfig>;
      if (custom.detail) {
        setWakeConfig(custom.detail);
      }
    };
    window.addEventListener(WAKE_TIME_CHANGED_EVENT, handleWakeChange);
    return () => window.removeEventListener(WAKE_TIME_CHANGED_EVENT, handleWakeChange);
  }, []);

  const handleWakeTimeChange = (newTime: string) => {
    if (!newTime) return;
    const updated = wakeTimeService.setManualWakeTime(newTime);
    setWakeConfig(updated);
    showFeedback('success', `Default wake-up time updated to ${newTime}.`);
  };

  const handleResetWakeTime = async () => {
    setIsRefreshingTz(true);
    try {
      const updated = await wakeTimeService.resetToAuto();
      setWakeConfig(updated);
      showFeedback('success', `Wake-up time reset to current local time (${updated.wakeTime}) in ${updated.timeZone}.`);
    } finally {
      setIsRefreshingTz(false);
    }
  };

  const handleRefreshTz = async () => {
    setIsRefreshingTz(true);
    try {
      const updated = await wakeTimeService.refreshTimeZone(true);
      setWakeConfig(updated);
      showFeedback('success', `Time zone verified: ${updated.timeZone}.`);
    } finally {
      setIsRefreshingTz(false);
    }
  };

  // Import flow state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importCandidate, setImportCandidate] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [localDreamCount, setLocalDreamCount] = useState(0);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);

  // Encrypted backup export state
  const [isExportEncryptedModalOpen, setIsExportEncryptedModalOpen] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [showExportPassphrase, setShowExportPassphrase] = useState(false);
  const [isExportingEncrypted, setIsExportingEncrypted] = useState(false);

  // Encrypted backup import state
  const [rawEncryptedFile, setRawEncryptedFile] = useState<string | null>(null);
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [showDecryptPassphrase, setShowDecryptPassphrase] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Delete all data flow state
  const [isWipeDialogOpen, setIsWipeDialogOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // Clear sample data flow state
  const [isClearSampleDialogOpen, setIsClearSampleDialogOpen] = useState(false);
  const [isClearingSample, setIsClearingSample] = useState(false);

  const checkSampleStatus = async () => {
    const exists = await backupService.hasSampleData();
    setHasSample(exists);
  };

  useEffect(() => {
    let isMounted = true;
    backupService.hasSampleData().then((exists) => {
      if (isMounted) setHasSample(exists);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 5000);
  };

  const handleToggleSubsequent = (enabled: boolean) => {
    celebrationService.setSubsequentCelebrationEnabled(enabled);
    setSubsequentCelebrationEnabled(enabled);
    showFeedback(
      'success',
      enabled
        ? 'Subsequent lucid dream celebrations enabled.'
        : 'Subsequent lucid dream celebrations turned off.'
    );
  };

  // 1. Export Plain Data
  const handleExportPlain = async () => {
    try {
      const data = await backupService.exportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `oneiric-journal-backup-${nowStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showFeedback('success', `Exported ${data.dreams.length} dreams and ${data.techniqueLogs.length} technique logs successfully.`);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Export failed.');
    }
  };

  // 2. Export Encrypted Data
  const handleExportEncrypted = async (e: React.FormEvent) => {
    e.preventDefault();
    const pass = exportPassphrase.trim();
    if (!pass) {
      showFeedback('error', 'Please enter a passphrase to encrypt your backup.');
      return;
    }

    try {
      setIsExportingEncrypted(true);
      const jsonStr = await backupService.exportEncryptedBackup(pass);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `oneiric-encrypted-backup-${nowStr}.enc.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExportEncryptedModalOpen(false);
      setExportPassphrase('');
      showFeedback('success', 'Encrypted backup (.enc.json) exported securely with AES-256-GCM.');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Encrypted export failed.');
    } finally {
      setIsExportingEncrypted(false);
    }
  };

  // 3. Select file for import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const count = await db.dreams.count();
    setLocalDreamCount(count);
    setReplaceConfirmed(false);
    setDecryptError(null);
    setDecryptPassphrase('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;

      if (backupService.isEncryptedBackup(content)) {
        setRawEncryptedFile(content);
        setImportCandidate(null);
      } else {
        setRawEncryptedFile(null);
        const validation = backupService.validateImportData(content);
        setImportCandidate(validation);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 4. Decrypt encrypted import candidate
  const handleDecryptEncryptedFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawEncryptedFile) return;
    const pass = decryptPassphrase.trim();
    if (!pass) {
      setDecryptError('Please enter your backup passphrase.');
      return;
    }

    try {
      setIsDecrypting(true);
      setDecryptError(null);
      const validation = await backupService.decryptAndValidateEncryptedBackup(rawEncryptedFile, pass);
      if (!validation.valid) {
        setDecryptError(validation.error || 'Decryption failed.');
      } else {
        setImportCandidate(validation);
        setRawEncryptedFile(null);
      }
    } catch (err: unknown) {
      setDecryptError(err instanceof Error ? err.message : 'Decryption error.');
    } finally {
      setIsDecrypting(false);
    }
  };

  // 5. Confirm Import
  const handleConfirmImport = async () => {
    if (!importCandidate || !importCandidate.data) return;

    if (importMode === 'replace' && localDreamCount > 0 && !replaceConfirmed) {
      showFeedback('error', 'Please confirm replacement by checking the confirmation box.');
      return;
    }

    try {
      setIsImporting(true);
      const res = await backupService.importData(importCandidate.data, importMode);
      setImportCandidate(null);
      setReplaceConfirmed(false);
      await checkSampleStatus();
      showFeedback(
        'success',
        `Successfully restored ${res.dreamCount} dreams and ${res.techniqueCount} technique logs.`
      );
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  // 6. Wipe all data
  const handleWipeAllConfirm = async () => {
    try {
      setIsWiping(true);
      await backupService.wipeAllData();
      await checkSampleStatus();
      setIsWipeDialogOpen(false);
      showFeedback('success', 'All local journal records have been securely cleared.');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to clear data.');
    } finally {
      setIsWiping(false);
    }
  };

  // 7. Load sample data
  const handleLoadSample = async () => {
    try {
      const res = await backupService.loadSampleData();
      setHasSample(true);
      showFeedback(
        'success',
        `Sample data active: ${res.dreamCount} dreams and ${res.techniqueCount} techniques loaded in preview.`
      );
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to load sample data.');
    }
  };

  // 8. Clear sample data
  const handleClearSampleConfirm = async () => {
    try {
      setIsClearingSample(true);
      await backupService.clearSampleData();
      setHasSample(false);
      setIsClearSampleDialogOpen(false);
      showFeedback('success', 'Sample preview data removed.');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to clear sample data.');
    } finally {
      setIsClearingSample(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Settings & Vault</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage local backups, multi-device end-to-end sync, celebrations, and data privacy.
        </p>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-red-950/40 border-red-800 text-red-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Section 0: End-to-End Multi-Device Sync Card */}
      <SyncSettingsCard onFeedback={showFeedback} />

      {/* Section 1: Backup & Restoration */}
      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <Database className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Backup & Restoration</h2>
            <p className="text-xs text-slate-400">Export your journal archive as plain or password-protected encrypted files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-1">
                <Download className="w-4 h-4 text-blue-400" />
                <span>Export Journal Archive</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Download a complete, structured file containing all dreams, lucidity notes, tags, dream signs, and technique logs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPlain}
                icon={<Download className="w-4 h-4" />}
                className="flex-1"
              >
                Plain JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExportPassphrase('');
                  setIsExportEncryptedModalOpen(true);
                }}
                icon={<Lock className="w-4 h-4 text-amber-400" />}
                className="flex-1"
              >
                Encrypted (.enc)
              </Button>
            </div>
          </div>

          {/* Import Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-1">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Restore from Backup</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Upload a verified Oneiric backup (.json or password-protected .enc.json). All data is validated before storage.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.enc.json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="import-file-input"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-4 h-4" />}
              >
                Select Backup File (.json / .enc)
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Sample Data Controls */}
      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Sample Exploration Preview</h2>
            <p className="text-xs text-slate-400">
              Preview Oneiric features with realistic dream entries and technique records
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Previewing sample data populates 5 astronomical dream narratives (including 2 lucid experiences) and 4 technique logs. This preview is purely temporary and <strong>will automatically disappear upon page refresh</strong>, leaving your real journal records untouched.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleLoadSample}
            icon={<Sparkles className="w-4 h-4 text-amber-400" />}
          >
            Preview Sample Data (Disappears on refresh)
          </Button>

          {hasSample && (
            <Button
              variant="outline"
              onClick={() => setIsClearSampleDialogOpen(true)}
            >
              Exit Preview Now
            </Button>
          )}
        </div>
      </section>

      {/* Section 3: Lucid Dream Celebration / Party Mode Preferences & Diagnostics */}
      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Lucid Dream Celebrations</h2>
            <p className="text-xs text-slate-400">
              Configure full-screen celebration party mode and testing tools
            </p>
          </div>
        </div>

        {/* Toggle Subsequent Celebrations */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="space-y-1">
            <label htmlFor="toggle-subsequent-celebration" className="text-sm font-semibold text-slate-200 cursor-pointer">
              Subsequent Lucid Dream Celebrations
            </label>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              When turned on, the full-screen celebration erupts whenever you record any lucid dream. When turned off, celebrations only trigger for your first-ever lucid dream, keeping subsequent journal entries quiet and uninterrupted.
            </p>
          </div>
          <div className="flex items-center pt-0.5">
            <input
              id="toggle-subsequent-celebration"
              type="checkbox"
              checked={subsequentCelebrationEnabled}
              onChange={(e) => handleToggleSubsequent(e.target.checked)}
              className="w-5 h-5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Diagnostics & Testing Tools */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="text-xs font-semibold text-slate-300">
            Developer & QA Testing Tools
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Preview the full-screen celebration safely without modifying your dream database or creating fake entries.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={() => celebrationService.triggerDevPreview(true)}
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
            >
              Preview First Lucid Dream (Full Explosion)
            </Button>

            <Button
              variant="outline"
              onClick={() => celebrationService.triggerDevPreview(false)}
              icon={<CheckCircle2 className="w-4 h-4 text-blue-400" />}
            >
              Preview Subsequent Lucid Dream (Standard)
            </Button>
          </div>
        </div>
      </section>

      {/* Section 4: Local Time Zone & Wake-Up Schedule */}
      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Wake-up Time & Time Zone</h2>
            <p className="text-xs text-slate-400">
              Automatic time zone detection and default wake-up schedule for journal entries
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Detected Time Zone */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Detected Time Zone</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-950/60 text-blue-300 border border-blue-800/60">
                  IANA
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Resolved from your system environment with IP geolocation fallback. Ensures DST transitions and nocturnal dates match your physical location.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="font-mono text-sm text-slate-200">
                {wakeConfig.timeZone}
                {wakeConfig.city && (
                  <span className="text-xs text-slate-400 block font-sans">
                    Approx. {wakeConfig.city}{wakeConfig.country ? `, ${wakeConfig.country}` : ''}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleRefreshTz}
                disabled={isRefreshingTz}
                icon={<Globe className="w-3.5 h-3.5 text-slate-400" />}
              >
                {isRefreshingTz ? 'Checking...' : 'Re-check'}
              </Button>
            </div>
          </div>

          {/* Default Wake-up Time */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Default Wake-up Time</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                    wakeConfig.isManualOverride
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  }`}
                >
                  {wakeConfig.isManualOverride ? 'Manual Override' : 'Current Clock Time'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Automatically initializes new entries with the actual current time in your local time zone upon waking. You can set a fixed preference here or adjust individual entries in the dream editor.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
              <input
                type="time"
                value={wakeConfig.wakeTime}
                onChange={(e) => handleWakeTimeChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
              {wakeConfig.isManualOverride && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleResetWakeTime}
                  disabled={isRefreshingTz}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Reset to Current Time
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Privacy & Local Storage Architecture */}
      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Privacy & Architecture</h2>
            <p className="text-xs text-slate-400">Zero tracking, zero telemetry, local-first storage</p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Oneiric is designed from the ground up to respect the profound intimacy of personal dreams.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400">
            <li>
              <strong>Where is my data stored?</strong> Everything is persisted in your browser's private IndexedDB storage container (named <code className="text-blue-300">OneiricDB</code>).
            </li>
            <li>
              <strong>Are dreams sent anywhere in plaintext?</strong> No. Your dreams remain strictly on your device. If you use Multi-Device Sync, your entries are encrypted locally with your secret passphrase via AES-256-GCM before transmission. The relay server only ever receives opaque ciphertext. Zero analytics, telemetry, or external AI APIs are ever used.
            </li>
            <li>
              <strong>Can I use Oneiric offline?</strong> Yes. Once loaded in your browser, Oneiric is fully functional without an internet connection (you can record, edit, browse, and analyze dreams completely offline). However, multi-device cloud sync requires an active internet connection to communicate with the encrypted relay, so syncing is unavailable while offline.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 6: Danger Zone (Factory Reset) */}
      <section className="p-6 rounded-xl bg-red-950/20 border border-red-900/40 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-red-900/40">
          <Trash2 className="w-5 h-5 text-red-400" />
          <div>
            <h2 className="text-base font-bold text-red-200">Danger Zone</h2>
            <p className="text-xs text-red-400/80">Irreversible actions that delete stored records</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Delete all stored dreams, custom tags, and technique logs from this device. Once deleted, data cannot be recovered unless you have a previous JSON backup.
        </p>

        <div>
          <Button
            variant="danger"
            onClick={() => setIsWipeDialogOpen(true)}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Clear All Application Data
          </Button>
        </div>
      </section>

      {/* Export Encrypted Backup Modal */}
      {isExportEncryptedModalOpen && (
        <Modal
          isOpen={isExportEncryptedModalOpen}
          onClose={() => setIsExportEncryptedModalOpen(false)}
          title="Export Encrypted Backup (.enc.json)"
          maxWidth="md"
        >
          <form onSubmit={handleExportEncrypted} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Client-Side AES-256-GCM Encryption</span>
              </div>
              <p>
                Your backup will be encrypted locally using PBKDF2 (100,000 SHA-256 iterations) and 256-bit AES-GCM.
                <strong> Do not lose your passphrase:</strong> without it, this encrypted backup file cannot be recovered by anyone.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Encryption Passphrase
                </label>
                <button
                  type="button"
                  onClick={() => setExportPassphrase(cryptoService.generatePassphrase())}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  <span>Generate strong phrase</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showExportPassphrase ? 'text' : 'password'}
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="e.g. astral-lucid-aurora-starlight-prism"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowExportPassphrase(!showExportPassphrase)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showExportPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsExportEncryptedModalOpen(false)}
                disabled={isExportingEncrypted}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isExportingEncrypted}
                icon={<Lock className="w-4 h-4" />}
              >
                Download Encrypted File
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Encrypted Backup Unlock Modal */}
      {rawEncryptedFile && (
        <Modal
          isOpen={!!rawEncryptedFile}
          onClose={() => setRawEncryptedFile(null)}
          title="Encrypted Backup Detected"
          maxWidth="md"
        >
          <form onSubmit={handleDecryptEncryptedFile} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-800 text-xs text-blue-200 flex items-start gap-2.5">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm mb-1 font-semibold text-blue-100">Password-Protected Archive</strong>
                <p className="text-slate-300">
                  This file is encrypted with client-side AES-256-GCM. Please enter your secret passphrase to decrypt and inspect the archive contents.
                </p>
              </div>
            </div>

            {decryptError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{decryptError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Decryption Passphrase
              </label>
              <div className="relative">
                <input
                  type={showDecryptPassphrase ? 'text' : 'password'}
                  value={decryptPassphrase}
                  onChange={(e) => setDecryptPassphrase(e.target.value)}
                  placeholder="Enter the passphrase used when exporting..."
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowDecryptPassphrase(!showDecryptPassphrase)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showDecryptPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setRawEncryptedFile(null)}
                disabled={isDecrypting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isDecrypting}
                icon={<Key className="w-4 h-4" />}
              >
                Unlock & Verify Archive
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Import Validation & Confirmation Modal */}
      {importCandidate && (
        <Modal
          isOpen={!!importCandidate}
          onClose={() => setImportCandidate(null)}
          title={importCandidate.valid ? 'Confirm Database Restore' : 'Invalid Backup File'}
          maxWidth="md"
        >
          {importCandidate.valid && importCandidate.stats ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-700/50 text-xs text-blue-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Backup Verified Successfully</span>
                </div>
                <p>• {importCandidate.stats.dreamCount} dream entries ({importCandidate.stats.lucidCount} lucid)</p>
                <p>• {importCandidate.stats.techniqueCount} technique logs</p>
                {Boolean(importCandidate.stats.dreamSignCount) && (
                  <p>• {importCandidate.stats.dreamSignCount} dream signs</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Import Mode:
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-start gap-2 p-3 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-200 block">Merge with existing data (Recommended)</span>
                      <span className="text-slate-400 leading-snug block">
                        Adds new entries without erasing your existing journal records. Resolves conflicts deterministically with timestamps.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-3 rounded-lg bg-slate-900 border border-red-900/60 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-semibold text-red-300 block">Replace existing data</span>
                      <span className="text-slate-400 leading-snug block">
                        Wipes current database first, replacing it entirely with the backup contents.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Explicit confirmation warning when Replace is selected on a populated journal */}
              {importMode === 'replace' && localDreamCount > 0 && (
                <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Warning: Destructive Replacement</span>
                  </div>
                  <p className="leading-relaxed">
                    You currently have <strong>{localDreamCount} dream entries</strong> stored locally. Replacing will permanently erase these entries before importing.
                  </p>
                  <label className="flex items-center gap-2 pt-1 font-medium cursor-pointer text-slate-200">
                    <input
                      type="checkbox"
                      checked={replaceConfirmed}
                      onChange={(e) => setReplaceConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border-red-700 text-red-600 focus:ring-red-500"
                    />
                    <span>I understand this will permanently replace my existing {localDreamCount} dreams.</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setImportCandidate(null)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  variant={importMode === 'replace' ? 'danger' : 'primary'}
                  onClick={handleConfirmImport}
                  isLoading={isImporting}
                  disabled={importMode === 'replace' && localDreamCount > 0 && !replaceConfirmed}
                >
                  Confirm Import
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm mb-1 font-semibold">Validation Failed</strong>
                  <p>{importCandidate.error || 'The file does not conform to the Oneiric backup specification.'}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setImportCandidate(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Clear Sample Data Dialog */}
      <ConfirmDialog
        isOpen={isClearSampleDialogOpen}
        onClose={() => setIsClearSampleDialogOpen(false)}
        onConfirm={handleClearSampleConfirm}
        title="Remove Sample Entries"
        message="Are you sure you want to remove the sample dream entries and technique logs? Your real dream entries will remain completely intact."
        confirmText="Remove Samples"
        isDestructive={false}
        isLoading={isClearingSample}
      />

      {/* Factory Reset Wipe Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isWipeDialogOpen}
        onClose={() => setIsWipeDialogOpen(false)}
        onConfirm={handleWipeAllConfirm}
        title="Wipe All Journal Data"
        message="This is a permanent destructive action. All dream entries, tags, and technique logs stored on this device will be erased immediately."
        confirmText="Delete All Data"
        requiredTypedText="DELETE"
        isDestructive={true}
        isLoading={isWiping}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { backupService } from '../services/backupService';
import { celebrationService } from '../services/celebrationService';
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
} from 'lucide-react';
import { SyncSettingsCard } from '../components/sync/SyncSettingsCard';

export const SettingsPage: React.FC = () => {
  const [hasSample, setHasSample] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Subsequent lucid dream celebrations toggle
  const [subsequentCelebrationEnabled, setSubsequentCelebrationEnabled] = useState(() =>
    celebrationService.isSubsequentCelebrationEnabled()
  );

  // Import flow state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importCandidate, setImportCandidate] = useState<ImportValidationResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);

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

  // 1. Export Data
  const handleExport = async () => {
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

  // 2. Select file for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = backupService.validateImportData(content);
      setImportCandidate(validation);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 3. Confirm Import
  const handleConfirmImport = async () => {
    if (!importCandidate || !importCandidate.data) return;

    try {
      setIsImporting(true);
      const res = await backupService.importData(importCandidate.data, importMode);
      setImportCandidate(null);
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

  // 4. Wipe all data
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

  // 5. Load sample exploration data
  const handleLoadSample = async () => {
    try {
      await backupService.loadSampleData();
      await checkSampleStatus();
      showFeedback('success', 'Sample exploration entries loaded. They will disappear when you refresh.');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to load sample data.');
    }
  };

  // 6. Clear sample data immediately
  const handleClearSampleConfirm = async () => {
    try {
      setIsClearingSample(true);
      await backupService.clearSampleData();
      await checkSampleStatus();
      setIsClearSampleDialogOpen(false);
      showFeedback('success', 'Sample exploration entries removed.');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to clear sample data.');
    } finally {
      setIsClearingSample(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-lg border text-xs sm:text-sm font-medium flex items-center justify-between transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border-red-800 text-red-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-3 font-semibold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Settings & Storage</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage local backups, multi-device synchronization, and celebration settings
        </p>
      </div>

      {/* Sync Card */}
      <SyncSettingsCard onFeedback={showFeedback} />

      {/* Section 1: Backup & Restore */}
      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <Database className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Backup & Restore</h2>
            <p className="text-xs text-slate-400">Offline-first JSON export and validated import</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-1">
                <Download className="w-4 h-4 text-blue-400" />
                <span>Export Journal Backup</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Download a clean, structured JSON file containing all dreams, lucidity notes, tags, and technique logs.
              </p>
            </div>
            <Button variant="secondary" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
              Download JSON Backup
            </Button>
          </div>

          {/* Import Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-1">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Restore from Backup</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Upload a verified Oneiric JSON backup file. All entries will be validated before database modification.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="import-file-input"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-4 h-4" />}
              >
                Select Backup File
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
              Preview Oneiric features with realistic, fictional dream entries and technique records
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

      {/* Section 4: Privacy & Local Storage Architecture */}
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
              <strong>Can I use Oneiric offline?</strong> Yes. Once loaded in your browser, Oneiric is fully functional without an internet connection.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 5: Danger Zone (Factory Reset) */}
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
                        Adds new entries without erasing your existing journal records.
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setImportCandidate(null)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  variant={importMode === 'replace' ? 'danger' : 'primary'}
                  onClick={handleConfirmImport}
                  isLoading={isImporting}
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

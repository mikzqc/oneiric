import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  Lock,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Share2,
  Unlink,
  ShieldCheck,
} from 'lucide-react';
import { syncService } from '../../services/syncService';
import { cryptoService } from '../../services/cryptoService';
import { SyncVaultCredentials } from '../../types/sync';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SyncSettingsCardProps {
  onFeedback: (type: 'success' | 'error', text: string) => void;
}

export const SyncSettingsCard: React.FC<SyncSettingsCardProps> = ({ onFeedback }) => {
  const [credentials, setCredentials] = useState<SyncVaultCredentials | null>(() =>
    syncService.getCredentials()
  );
  const [activeTab, setActiveTab] = useState<'create' | 'connect'>('create');

  // Creation form state
  const [createDeviceName, setCreateDeviceName] = useState('Primary Device');
  const [createPassphrase, setCreatePassphrase] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Connection form state
  const [connectSyncKey, setConnectSyncKey] = useState('');
  const [connectPassphrase, setConnectPassphrase] = useState('');
  const [connectDeviceName, setConnectDeviceName] = useState('Mobile Device');
  const [showSeparateInputs, setShowSeparateInputs] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Active vault state
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);

  // Direct transfer state
  const [showDirectTransfer, setShowDirectTransfer] = useState(false);
  const [directCode, setDirectCode] = useState('');
  const [directPassphrase, setDirectPassphrase] = useState('');
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importPassInput, setImportPassInput] = useState('');
  const [isExportingDirect, setIsExportingDirect] = useState(false);
  const [isImportingDirect, setIsImportingDirect] = useState(false);

  const loadCredentials = () => {
    setCredentials(syncService.getCredentials());
  };

  useEffect(() => {
    const handleStatusChange = () => {
      loadCredentials();
    };
    window.addEventListener('oneiric:sync-status-changed', handleStatusChange);
    return () => {
      window.removeEventListener('oneiric:sync-status-changed', handleStatusChange);
    };
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
    onFeedback('success', `${label} copied to clipboard.`);
  };

  const handleGeneratePassphrase = () => {
    const generated = cryptoService.generatePassphrase();
    setCreatePassphrase(generated);
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const pass = createPassphrase.trim() || cryptoService.generatePassphrase();
      await syncService.createVault({
        passphrase: pass,
        deviceName: createDeviceName.trim() || 'Primary Device',
      });
      loadCredentials();
      onFeedback(
        'success',
        `Sync Vault created successfully! Use your Sync Key to connect other devices.`
      );
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Failed to create Sync Vault.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectSyncKey.trim()) {
      onFeedback('error', 'Please enter your Sync Key or Vault ID.');
      return;
    }
    try {
      setIsConnecting(true);
      const res = await syncService.connectVault(
        connectSyncKey,
        connectPassphrase,
        connectDeviceName.trim() || 'Secondary Device'
      );
      loadCredentials();
      onFeedback(
        'success',
        `Connected and synced ${res.pulledCount} dreams from your vault!`
      );
      setConnectSyncKey('');
      setConnectPassphrase('');
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Could not connect to vault.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      const res = await syncService.syncNow();
      loadCredentials();
      if (res.newDreamsCount > 0) {
        onFeedback(
          'success',
          `Vault synced cleanly: +${res.newDreamsCount} new dream(s) downloaded and merged! (${res.pushedCount} total dreams active).`
        );
      } else {
        onFeedback(
          'success',
          `Vault synced cleanly: No new remote dreams found. All ${res.pushedCount} local dreams are up to date with cloud vault.`
        );
      }
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = () => {
    if (!credentials) return;
    const nextState = !credentials.autoSync;
    syncService.setAutoSync(nextState);
    loadCredentials();
    onFeedback('success', `Auto-sync on dream save is now ${nextState ? 'enabled' : 'disabled'}.`);
  };

  const handleDisconnectConfirm = () => {
    syncService.clearCredentials();
    loadCredentials();
    setIsDisconnectDialogOpen(false);
    onFeedback('success', 'Disconnected from sync vault. All your dreams remain safely on this device.');
  };

  const handleGenerateDirectTransfer = async () => {
    try {
      setIsExportingDirect(true);
      const { code, passphrase } = await syncService.exportEncryptedTransferCode();
      setDirectCode(code);
      setDirectPassphrase(passphrase);
      onFeedback('success', 'Generated encrypted transfer code.');
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Failed to generate transfer code.');
    } finally {
      setIsExportingDirect(false);
    }
  };

  const handleImportDirectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCodeInput.trim() || !importPassInput.trim()) {
      onFeedback('error', 'Please provide both the transfer code and the decryption passphrase.');
      return;
    }
    try {
      setIsImportingDirect(true);
      const count = await syncService.importEncryptedTransferCode(importCodeInput, importPassInput);
      onFeedback('success', `Imported ${count} dreams from direct transfer package.`);
      setImportCodeInput('');
      setImportPassInput('');
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Failed to import transfer package.');
    } finally {
      setIsImportingDirect(false);
    }
  };

  const unifiedKey = credentials
    ? cryptoService.formatUnifiedSyncKey(credentials.vaultId, credentials.passphrase)
    : '';

  return (
    <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-700/40 flex items-center justify-center text-blue-400 shrink-0">
            <Cloud className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Multi-Device Sync</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-950/90 text-blue-300 border border-blue-800/60 uppercase tracking-wider">
                <Lock className="w-3 h-3 text-blue-400" />
                E2E Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Synchronize dreams across your phone, tablet, and PC with client-side AES-256 encryption
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {credentials ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-700/50 text-xs font-medium text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Connected & Active</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Zero-Knowledge Privacy:</strong> All dream entries and notes are encrypted locally in your browser using AES-256-GCM before transmission. The sync relay only ever receives unreadable ciphertext. Your secret passphrase never leaves your devices.
        </p>
      </div>

      {/* State A: Vault is Active on this Device */}
      {credentials ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Sync Key Card */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span>Device Sync Key</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Single-string pair</span>
              </div>
              <p className="text-xs text-slate-400">
                Paste this key into Oneiric Settings on your phone or other device to pair automatically.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value={unifiedKey}
                  className="grow px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none select-all"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(unifiedKey, 'Sync Key')}
                  icon={copiedKey === 'Sync Key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedKey === 'Sync Key' ? 'Copied' : 'Copy Key'}
                </Button>
              </div>
            </div>

            {/* Passphrase & Vault Details Card */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Secret Passphrase</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassphrase ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  readOnly
                  value={credentials.passphrase}
                  className="grow px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(credentials.passphrase, 'Passphrase')}
                  icon={copiedKey === 'Passphrase' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedKey === 'Passphrase' ? 'Copied' : 'Copy'}
                </Button>
              </div>

              <div className="flex flex-col gap-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span>Vault ID: <strong className="text-slate-300 font-mono">{credentials.vaultId}</strong></span>
                  <span>Last Local Sync: <strong className="text-slate-300">{credentials.lastSyncedAt ? new Date(credentials.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</strong></span>
                </div>
                {credentials.lastRemoteDevice && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Cloud Update:</span>
                    <strong className="text-blue-300 font-medium">
                      {credentials.lastRemoteDevice}
                      {credentials.lastRemoteUpdate ? ` (${new Date(credentials.lastRemoteUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Actions Bar */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={credentials.autoSync}
                  onChange={handleToggleAutoSync}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Auto-sync when dreams are recorded or edited</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDisconnectDialogOpen(true)}
                icon={<Unlink className="w-4 h-4 text-red-400" />}
                className="text-red-300 hover:text-red-200 hover:bg-red-950/40 border-red-900/40"
              >
                Disconnect
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
                icon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
              >
                {isSyncing ? 'Syncing Vault...' : 'Sync Now'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* State B: No Vault Configured Yet */
        <div className="space-y-4">
          {/* Tab selector */}
          <div className="flex rounded-lg bg-slate-900/80 p-1 border border-slate-800 max-w-md">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`grow py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Create New Sync Vault
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('connect')}
              className={`grow py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'connect'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Connect Existing Device
            </button>
          </div>

          {activeTab === 'create' ? (
            /* Creation Form */
            <form onSubmit={handleCreateVault} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">Initialize a New Private Sync Vault</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start here on your primary device. This will generate an end-to-end encrypted vault slot and give you a Sync Key to pair your mobile phone or other computers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Device Name (optional)</label>
                  <input
                    type="text"
                    value={createDeviceName}
                    onChange={(e) => setCreateDeviceName(e.target.value)}
                    placeholder="e.g. My Laptop"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400">Custom Passphrase (or leave blank to auto-generate)</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassphrase}
                      className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={createPassphrase}
                    onChange={(e) => setCreatePassphrase(e.target.value)}
                    placeholder="astral-lucid-starlight-nebula-aurora-velvet"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating}
                  icon={<Cloud className="w-4 h-4" />}
                >
                  {isCreating ? 'Creating Encrypted Vault...' : 'Create Sync Vault & Upload Dreams'}
                </Button>
              </div>
            </form>
          ) : (
            /* Connection Form */
            <form onSubmit={handleConnectVault} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">Connect to an Existing Vault</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter the <strong>Sync Key</strong> from your primary device to download and synchronize all your dream records.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400">Sync Key</label>
                    <button
                      type="button"
                      onClick={() => setShowSeparateInputs(!showSeparateInputs)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      {showSeparateInputs ? 'Use Single Unified Key' : 'Enter Vault ID & Passphrase Separately'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={connectSyncKey}
                    onChange={(e) => setConnectSyncKey(e.target.value)}
                    placeholder={showSeparateInputs ? 'e.g. ddcbcaa' : 'ONR-SYNC-ddcbcaa::celestial-lucid-...'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {showSeparateInputs && (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Secret Encryption Passphrase</label>
                    <input
                      type="password"
                      value={connectPassphrase}
                      onChange={(e) => setConnectPassphrase(e.target.value)}
                      placeholder="Enter the 6-word passphrase from your primary device"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">This Device Name</label>
                  <input
                    type="text"
                    value={connectDeviceName}
                    onChange={(e) => setConnectDeviceName(e.target.value)}
                    placeholder="e.g. iPhone / Safari"
                    className="w-full max-w-xs px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isConnecting}
                  icon={<RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin' : ''}`} />}
                >
                  {isConnecting ? 'Connecting & Syncing...' : 'Connect & Sync Dreams'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Direct Device-to-Device Encrypted Transfer (Accordion) */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowDirectTransfer(!showDirectTransfer)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Air-Gapped / Direct Device Transfer (No relay required)</span>
          <span className="text-[10px] text-slate-500">[{showDirectTransfer ? 'Close' : 'Expand'}]</span>
        </button>

        {showDirectTransfer && (
          <div className="mt-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-4">
            <p className="text-xs text-slate-400">
              Prefer not to use cloud relays? Generate a standalone encrypted code containing all your dream logs, or paste one from another device.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Direct Export */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300">Export Direct Code</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleGenerateDirectTransfer}
                  disabled={isExportingDirect}
                >
                  {isExportingDirect ? 'Encrypting...' : 'Generate Encrypted Package'}
                </Button>

                {directCode && (
                  <div className="space-y-2 pt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">Passphrase:</span>
                      <div className="p-1.5 rounded bg-slate-900 text-xs font-mono text-amber-300 break-all select-all">
                        {directPassphrase}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">Encrypted Code:</span>
                      <textarea
                        readOnly
                        value={directCode}
                        rows={3}
                        className="w-full p-2 rounded bg-slate-900 text-[10px] font-mono text-slate-300 border border-slate-800 focus:outline-none select-all resize-none"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(directCode, 'Direct Code')}
                    >
                      Copy Encrypted Code
                    </Button>
                  </div>
                )}
              </div>

              {/* Direct Import */}
              <form onSubmit={handleImportDirectTransfer} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300">Import Direct Code</span>
                <textarea
                  rows={2}
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                  placeholder="Paste encrypted transfer package here..."
                  className="w-full p-2 rounded bg-slate-900 text-[10px] font-mono text-slate-300 border border-slate-800 focus:outline-none resize-none"
                />
                <input
                  type="password"
                  value={importPassInput}
                  onChange={(e) => setImportPassInput(e.target.value)}
                  placeholder="Enter decryption passphrase"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-900 text-xs font-mono text-slate-200 border border-slate-800 focus:outline-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={isImportingDirect}
                >
                  {isImportingDirect ? 'Decrypting...' : 'Import & Merge Dreams'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDisconnectDialogOpen}
        onClose={() => setIsDisconnectDialogOpen(false)}
        onConfirm={handleDisconnectConfirm}
        title="Disconnect Sync Vault?"
        message="This will sever this device's connection to the cloud sync vault. All your dreams, tags, and notes will remain untouched on this device. You can reconnect anytime with your Sync Key."
        confirmText="Disconnect Vault"
        isDestructive={true}
      />
    </section>
  );
};

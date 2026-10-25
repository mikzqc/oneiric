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
  ShieldAlert,
  Laptop,
  Smartphone,
  Tablet,
  UserX,
  KeyRound,
} from 'lucide-react';
import { syncService } from '../../services/syncService';
import { cryptoService } from '../../services/cryptoService';
import { SyncVaultCredentials, SyncedDevice } from '../../types/sync';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SyncSettingsCardProps {
  onFeedback: (type: 'success' | 'error', text: string) => void;
}

function formatSyncRelativeTime(isoString?: string): string {
  if (!isoString) return 'Never';
  const time = new Date(isoString).getTime();
  if (isNaN(time)) return 'Never';
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
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
  const [showConnectPassphrase, setShowConnectPassphrase] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Active vault state
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncKey, setShowSyncKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);

  // Device management state
  const [deviceToRevoke, setDeviceToRevoke] = useState<SyncedDevice | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isReKeyDialogOpen, setIsReKeyDialogOpen] = useState(false);
  const [isReKeying, setIsReKeying] = useState(false);

  // Direct transfer state
  const [showDirectTransfer, setShowDirectTransfer] = useState(false);
  const [directCode, setDirectCode] = useState('');
  const [directPassphrase, setDirectPassphrase] = useState('');
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importPassInput, setImportPassInput] = useState('');
  const [showImportPass, setShowImportPass] = useState(false);
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
        `Connected to Sync Vault! Merged ${res.newDreamsCount} new dreams into this device.`
      );
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Failed to connect to Sync Vault.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      const res = await syncService.syncNow();
      loadCredentials();
      onFeedback(
        'success',
        `Sync completed: ${res.newDreamsCount} new dreams received, ${res.pushedCount} total uploaded.`
      );
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Sync operation failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    syncService.setAutoSync(enabled);
    loadCredentials();
    onFeedback('success', enabled ? 'Auto-sync enabled.' : 'Auto-sync disabled.');
  };

  const handleDisconnectConfirm = () => {
    syncService.clearCredentials();
    loadCredentials();
    setIsDisconnectDialogOpen(false);
    onFeedback('success', 'Disconnected from sync vault. Local dreams remain intact.');
  };

  const handleConfirmRevoke = async () => {
    if (!deviceToRevoke) return;
    try {
      setIsRevoking(true);
      await syncService.revokeDevice(deviceToRevoke.id);
      loadCredentials();
      onFeedback(
        'success',
        `"${deviceToRevoke.name}" has been revoked and blocked from syncing with this vault.`
      );
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Failed to revoke device access.');
    } finally {
      setIsRevoking(false);
      setDeviceToRevoke(null);
    }
  };

  const handleConfirmReKey = async () => {
    try {
      setIsReKeying(true);
      await syncService.rotateVaultKey();
      loadCredentials();
      onFeedback(
        'success',
        'Vault re-keyed successfully! A fresh encryption key was generated. All revoked devices are completely excluded.'
      );
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Failed to rotate vault key.');
    } finally {
      setIsReKeying(false);
      setIsReKeyDialogOpen(false);
    }
  };

  const handleGenerateDirectTransfer = async () => {
    try {
      setIsExportingDirect(true);
      const { code, passphrase } = await syncService.exportEncryptedTransferCode();
      setDirectCode(code);
      setDirectPassphrase(passphrase);
      onFeedback('success', 'Direct transfer package encrypted successfully.');
    } catch (err: unknown) {
      onFeedback('error', err instanceof Error ? err.message : 'Failed to generate transfer package.');
    } finally {
      setIsExportingDirect(false);
    }
  };

  const handleImportDirectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCodeInput.trim()) {
      onFeedback('error', 'Please enter the encrypted transfer code.');
      return;
    }
    if (!importPassInput.trim()) {
      onFeedback('error', 'Please enter the decryption passphrase.');
      return;
    }
    try {
      setIsImportingDirect(true);
      const count = await syncService.importEncryptedTransferCode(importCodeInput, importPassInput);
      onFeedback('success', `Direct transfer successful: merged ${count} dreams into your journal.`);
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

  const devices: SyncedDevice[] = React.useMemo(() => {
    if (credentials?.devices && credentials.devices.length > 0) {
      return credentials.devices;
    }
    if (credentials?.deviceId) {
      const fallbackDate = credentials.createdAt || '2026-01-01T00:00:00.000Z';
      return [
        {
          id: credentials.deviceId,
          name: credentials.deviceName || 'Primary Device',
          type: credentials.deviceType || 'desktop',
          pairedAt: fallbackDate,
          lastSyncAt: credentials.lastSyncedAt || fallbackDate,
          status: 'active',
        },
      ];
    }
    return [];
  }, [credentials]);

  const otherDevices = devices.filter((d) => d.id !== credentials?.deviceId);

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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Single-string pair</span>
                  <button
                    type="button"
                    onClick={() => setShowSyncKey(!showSyncKey)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showSyncKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showSyncKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Paste this key into Oneiric Settings on your phone or other device to pair automatically.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  value={unifiedKey}
                  className={`grow px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none select-all ${
                    showSyncKey ? 'mask-secret-none' : 'mask-secret-disc'
                  }`}
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

              {/* Sensitive Credential Disclaimer A: Device Sync Key */}
              <div className="p-2.5 rounded-lg bg-amber-950/25 border border-amber-800/40 text-[11px] text-amber-200/90 flex items-start gap-2.5 mt-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <strong className="text-amber-300 block font-semibold">Keep your Device Sync Key private.</strong>
                  <p className="text-amber-200/80">
                    Anyone who obtains this key may be able to pair another device with your sync vault, depending on the authentication and pairing design. Only share it through a trusted, intentional pairing process. Never post it publicly, send it to strangers, or include it in screenshots or support requests.
                  </p>
                </div>
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
                  type="text"
                  readOnly
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  value={credentials.passphrase}
                  className={`grow px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none select-all ${
                    showPassphrase ? 'mask-secret-none' : 'mask-secret-disc'
                  }`}
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

              {/* Sensitive Credential Disclaimer B: Secret Passphrase */}
              <div className="p-2.5 rounded-lg bg-red-950/25 border border-red-800/40 text-[11px] text-red-200/90 flex items-start gap-2.5 mt-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <strong className="text-red-300 block font-semibold">Never share your Secret Passphrase.</strong>
                  <p className="text-red-200/80">
                    Your dream journal may contain deeply personal experiences, private thoughts, and sensitive information. Keep your passphrase to yourself. Oneiric support will never need you to disclose it. Anyone who obtains the passphrase may be able to compromise your encrypted journal if they also obtain the required encrypted data or credentials.
                  </p>
                </div>
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

          {/* Connected Devices Management Section */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/70">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-slate-200">
                  Connected Devices ({devices.filter((d) => d.status !== 'revoked').length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Manage devices authorized to synchronize with this vault
              </span>
            </div>

            {/* Device List */}
            <div className="space-y-2">
              {devices.map((device) => {
                const isCurrentDevice = device.id === credentials.deviceId;
                const isRevoked = device.status === 'revoked';

                return (
                  <div
                    key={device.id}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isCurrentDevice
                        ? 'bg-blue-950/20 border-blue-900/50'
                        : isRevoked
                        ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                        : 'bg-slate-950/70 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`p-2 rounded-lg border shrink-0 ${
                          isCurrentDevice
                            ? 'bg-blue-900/30 border-blue-700/40 text-blue-400'
                            : isRevoked
                            ? 'bg-slate-900 border-slate-800 text-slate-500'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {device.type === 'mobile' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : device.type === 'tablet' ? (
                          <Tablet className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-slate-100">
                            {device.name}
                          </span>
                          {isCurrentDevice && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-950 text-blue-300 border border-blue-800/60">
                              This Device
                            </span>
                          )}
                          {isRevoked ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/60 text-red-300 border border-red-800/50">
                              Revoked
                            </span>
                          ) : !isCurrentDevice ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                              Active
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                          <span>
                            Paired: {new Date(device.pairedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span>•</span>
                          <span>
                            Last synced: {formatSyncRelativeTime(device.lastSyncAt)}
                          </span>
                          {isRevoked && device.revokedAt && (
                            <>
                              <span>•</span>
                              <span className="text-red-400">
                                Revoked on {new Date(device.revokedAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center self-end sm:self-center">
                      {isCurrentDevice ? (
                        <span className="text-[11px] text-slate-500 italic">
                          Current device (use Disconnect below)
                        </span>
                      ) : isRevoked ? (
                        <span className="text-[11px] text-red-400/80 font-medium">
                          Access Revoked
                        </span>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setDeviceToRevoke(device)}
                          icon={<UserX className="w-3.5 h-3.5 text-red-400" />}
                          className="text-red-300 hover:text-red-200 hover:bg-red-950/40 border-red-900/60"
                        >
                          Remove Device
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {otherDevices.length === 0 && (
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
                  No other devices are currently paired with this vault. Use your Device Sync Key to connect your phone, tablet, or secondary computer.
                </div>
              )}
            </div>

            {/* Security Boundary Notice & Re-Key Option */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/70 text-[11px] text-slate-400 space-y-2 leading-relaxed">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Device Revocation & Security Boundaries</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReKeyDialogOpen(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Rotate Vault Key</span>
                </button>
              </div>
              <p>
                Removing a device immediately revokes its authorization and blocks it from future synchronization with this vault. However, revocation cannot remotely erase dream records already downloaded onto that device before removal.
              </p>
              <p className="text-slate-500">
                For complete cryptographic forward secrecy (if you suspect a device or passphrase was compromised), rotate your vault key. This generates a fresh vault and passphrase, completely excluding all revoked devices.
              </p>
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
            <form onSubmit={handleCreateVault} autoComplete="off" className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
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
                    autoComplete="off"
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
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
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
            <form onSubmit={handleConnectVault} autoComplete="off" className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
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
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    value={connectSyncKey}
                    onChange={(e) => setConnectSyncKey(e.target.value)}
                    placeholder={showSeparateInputs ? 'e.g. ddcbcaa' : 'ONR-SYNC-ddcbcaa::celestial-lucid-...'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {showSeparateInputs && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400">Secret Encryption Passphrase</label>
                      <button
                        type="button"
                        onClick={() => setShowConnectPassphrase(!showConnectPassphrase)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {showConnectPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showConnectPassphrase ? 'Hide' : 'Reveal'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      autoComplete="off"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      data-form-type="other"
                      value={connectPassphrase}
                      onChange={(e) => setConnectPassphrase(e.target.value)}
                      placeholder="Enter the 6-word passphrase from your primary device"
                      className={`w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 ${
                        showConnectPassphrase ? 'mask-secret-none' : 'mask-secret-disc'
                      }`}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">This Device Name</label>
                  <input
                    type="text"
                    autoComplete="off"
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
              <form onSubmit={handleImportDirectTransfer} autoComplete="off" className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300">Import Direct Code</span>
                <textarea
                  rows={2}
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                  placeholder="Paste encrypted transfer package here..."
                  className="w-full p-2 rounded bg-slate-900 text-[10px] font-mono text-slate-300 border border-slate-800 focus:outline-none resize-none"
                />
                <div className="relative flex items-center">
                  <input
                    type="text"
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    value={importPassInput}
                    onChange={(e) => setImportPassInput(e.target.value)}
                    placeholder="Enter decryption passphrase"
                    className={`w-full px-2.5 py-1.5 pr-8 rounded bg-slate-900 text-xs font-mono text-slate-200 border border-slate-800 focus:outline-none ${
                      showImportPass ? 'mask-secret-none' : 'mask-secret-disc'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowImportPass(!showImportPass)}
                    className="absolute right-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showImportPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
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

      {/* Revoke Device Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deviceToRevoke)}
        onClose={() => setDeviceToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        title={`Remove ${deviceToRevoke?.name || 'Device'}?`}
        message={`Revoking access will disconnect "${deviceToRevoke?.name || 'this device'}" from this sync vault and block it from future synchronization.\n\nNote: This prevents future sync operations, but does not wipe data already downloaded onto that device.`}
        confirmText="Revoke Device Access"
        isDestructive={true}
        isLoading={isRevoking}
      />

      {/* Rotate Vault Key Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isReKeyDialogOpen}
        onClose={() => setIsReKeyDialogOpen(false)}
        onConfirm={handleConfirmReKey}
        title="Rotate Vault Encryption Key?"
        message="This will generate a brand new Sync Vault with a fresh encryption passphrase and migrate your local dreams. All previously paired and revoked devices will be completely locked out. You will need to re-pair any trusted devices using the new Sync Key."
        confirmText="Rotate Key & Create New Vault"
        isDestructive={false}
        isLoading={isReKeying}
      />
    </section>
  );
};

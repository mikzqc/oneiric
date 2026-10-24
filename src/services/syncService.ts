import { backupService } from './backupService';
import { cryptoService } from './cryptoService';
import {
  SyncVaultCredentials,
  EncryptedSyncEnvelope,
  SyncResult,
  SyncState,
} from '../types/sync';
import { BackupPayload } from '../types/backup';
import { tombstoneService } from '../utils/tombstones';

const CREDENTIALS_STORAGE_KEY = 'oneiric_sync_vault';

let autoSyncTimeout: ReturnType<typeof setTimeout> | null = null;
let activeSyncPromise: Promise<SyncResult> | null = null;
let autoSyncRetryCount = 0;
let lastSyncError: string | null = null;
const MAX_AUTO_SYNC_RETRIES = 3;
const INITIAL_RETRY_BACKOFF_MS = 2000;

export const CANONICAL_CLOUD_RELAY = 'https://oneiric-one.vercel.app/api/vault';

export const NO_CACHE_HEADERS: HeadersInit = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
};

export function buildFreshUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
}

export function getRelayUrl(customRelayUrl?: string, vaultId?: string): string {
  if (customRelayUrl && !customRelayUrl.includes('extendsclass.com')) {
    const clean = customRelayUrl.replace(/\/+$/, '');
    return vaultId ? `${clean}/${encodeURIComponent(vaultId)}` : clean;
  }
  return vaultId ? `${CANONICAL_CLOUD_RELAY}?id=${encodeURIComponent(vaultId)}` : CANONICAL_CLOUD_RELAY;
}

export const syncService = {
  /**
   * Retrieves saved sync vault credentials from local storage
   */
  getCredentials(): SyncVaultCredentials | null {
    try {
      const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SyncVaultCredentials;
    } catch {
      return null;
    }
  },

  /**
   * Persists sync vault credentials in local storage
   */
  saveCredentials(creds: SyncVaultCredentials): void {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
    this.notifyStatusChanged();
  },

  /**
   * Clears saved sync vault credentials (disconnects vault, retains local dreams)
   */
  clearCredentials(): void {
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    this.notifyStatusChanged();
  },

  /**
   * Records a deleted record ID to prevent resurrection during sync
   */
  recordDeletion(id: string): void {
    tombstoneService.recordDeletion(id);
  },

  /**
   * Records multiple deleted record IDs
   */
  recordDeletions(ids: string[]): void {
    tombstoneService.recordDeletions(ids);
  },

  /**
   * Checks if an ID has been marked as deleted
   */
  isDeleted(id: string): boolean {
    return tombstoneService.isDeleted(id);
  },

  /**
   * Returns list of currently tracked deleted IDs
   */
  getDeletedIds(): string[] {
    return tombstoneService.getDeletedIds();
  },

  /**
   * Clears tombstones on full data reset
   */
  clearTombstones(): void {
    tombstoneService.clearTombstones();
  },

  /**
   * Checks whether this device is linked to an encrypted sync vault
   */
  isConfigured(): boolean {
    const creds = this.getCredentials();
    return Boolean(creds && creds.vaultId && creds.passphrase);
  },

  /**
   * Helper to dispatch sync state update events for reactive UI
   */
  notifyStatusChanged(): void {
    try {
      window.dispatchEvent(new CustomEvent('oneiric:sync-status-changed'));
    } catch {
      // ignore non-browser environments
    }
  },

  /**
   * Retrieves current sync state for UI components
   */
  getSyncState(): SyncState {
    const creds = this.getCredentials();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return {
      status: activeSyncPromise ? 'syncing' : lastSyncError ? 'error' : 'idle',
      lastSyncedAt: creds?.lastSyncedAt || null,
      error: lastSyncError,
      isConfigured: Boolean(creds?.vaultId && creds?.passphrase),
      vaultId: creds?.vaultId || null,
      autoSync: creds?.autoSync ?? true,
      lastRemoteDevice: creds?.lastRemoteDevice || null,
      lastRemoteUpdate: creds?.lastRemoteUpdate || null,
      isOnline,
      retryAttempt: autoSyncRetryCount,
    };
  },

  /**
   * Creates a new encrypted vault slot on the cloud relay
   */
  async createVault(options?: {
    passphrase?: string;
    deviceName?: string;
    relayUrl?: string;
  }): Promise<{ vaultId: string; passphrase: string; unifiedKey: string }> {
    const passphrase = options?.passphrase?.trim() || cryptoService.generatePassphrase();
    const relayUrl = options?.relayUrl?.trim();
    const deviceName = options?.deviceName || 'Primary Device';

    // 1. Export local journal data
    const localData = await backupService.exportData();

    // 2. Encrypt locally using client-side Web Crypto (AES-GCM-256)
    const encrypted = await cryptoService.encryptData(localData, passphrase);

    // 3. Post encrypted payload to cloud relay
    const envelope: Partial<EncryptedSyncEnvelope> = {
      version: 2,
      salt: encrypted.salt,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      updatedAt: new Date().toISOString(),
      sourceDevice: deviceName,
    };

    const targetUrl = getRelayUrl(relayUrl);
    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...NO_CACHE_HEADERS,
        },
        body: JSON.stringify(envelope),
        cache: 'no-store',
      });
    } catch (networkErr: unknown) {
      throw new Error(
        `Could not connect to the sync relay: ${
          networkErr instanceof Error ? networkErr.message : 'Network error'
        }. Please check your internet connection.`
      );
    }

    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errJson = (await res.json()) as { error?: string };
        if (errJson?.error) errText = errJson.error;
      } catch {
        // ignore
      }
      throw new Error(`Failed to initialize cloud vault (${errText}).`);
    }

    const json = (await res.json()) as { id?: string };
    const vaultId = json.id;
    if (!vaultId) {
      throw new Error('Relay returned invalid vault identification.');
    }

    // 4. Save credentials locally
    const nowStr = new Date().toISOString();
    const creds: SyncVaultCredentials = {
      vaultId,
      passphrase,
      createdAt: nowStr,
      lastSyncedAt: nowStr,
      relayUrl,
      autoSync: true,
      deviceName,
    };
    this.saveCredentials(creds);

    const unifiedKey = cryptoService.formatUnifiedSyncKey(vaultId, passphrase);
    return { vaultId, passphrase, unifiedKey };
  },

  /**
   * Connects this device to an existing vault using unified sync key or vault ID + passphrase
   */
  async connectVault(
    vaultIdOrUnifiedKey: string,
    passphraseInput?: string,
    deviceName = 'Secondary Device'
  ): Promise<SyncResult> {
    let vaultId = '';
    let passphrase = '';

    const parsed = cryptoService.parseUnifiedSyncKey(vaultIdOrUnifiedKey);
    if (parsed) {
      vaultId = parsed.vaultId;
      passphrase = parsed.passphrase;
    } else {
      vaultId = vaultIdOrUnifiedKey.trim();
      passphrase = (passphraseInput || '').trim();
    }

    if (!vaultId) {
      throw new Error('Please enter a valid Vault ID or Sync Key.');
    }
    if (!passphrase) {
      throw new Error('Please enter your secret Encryption Passphrase.');
    }

    const getUrl = buildFreshUrl(getRelayUrl(undefined, vaultId));

    // 1. Pull encrypted envelope from cloud relay
    let res: Response;
    try {
      res = await fetch(getUrl, {
        method: 'GET',
        headers: NO_CACHE_HEADERS,
        cache: 'no-store',
      });
    } catch (networkErr: unknown) {
      throw new Error(
        `Could not reach sync vault: ${
          networkErr instanceof Error ? networkErr.message : 'Network error'
        }. Please check your connection.`
      );
    }

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Sync vault not found. Please verify the Vault ID.');
      }
      throw new Error(`Failed to fetch cloud vault (HTTP ${res.status}).`);
    }

    const envelope = (await res.json()) as EncryptedSyncEnvelope;
    if (!envelope || !envelope.ciphertext || !envelope.salt || !envelope.iv) {
      throw new Error('The cloud vault contains malformed encrypted data.');
    }

    // 2. Decrypt envelope using passphrase (validates authentication tag)
    const remoteData = await cryptoService.decryptData<BackupPayload>(envelope, passphrase);

    // 3. Validate decrypted backup schema
    const validation = backupService.validateImportData(JSON.stringify(remoteData));
    if (!validation.valid || !validation.data) {
      throw new Error(`Cloud vault data failed validation: ${validation.error}`);
    }

    // 4. Merge remote records into local IndexedDB
    const importRes = await backupService.importData(validation.data, 'merge');

    // 5. Re-export merged dataset, encrypt, and push back to vault to ensure complete bidirectional sync
    const mergedData = await backupService.exportData();
    const updatedEncrypted = await cryptoService.encryptData(mergedData, passphrase);

    const updatedEnvelope: EncryptedSyncEnvelope = {
      version: 2,
      vaultId,
      salt: updatedEncrypted.salt,
      iv: updatedEncrypted.iv,
      ciphertext: updatedEncrypted.ciphertext,
      updatedAt: new Date().toISOString(),
      sourceDevice: deviceName,
    };

    const putUrl = getRelayUrl(undefined, vaultId);
    let putRes: Response;
    try {
      putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...NO_CACHE_HEADERS,
        },
        body: JSON.stringify(updatedEnvelope),
        cache: 'no-store',
      });
    } catch (networkErr: unknown) {
      throw new Error(
        `Failed to update cloud vault: ${
          networkErr instanceof Error ? networkErr.message : 'Network error'
        }.`
      );
    }

    if (!putRes.ok) {
      throw new Error(`Failed to update cloud vault (HTTP ${putRes.status}).`);
    }

    const nowStr = new Date().toISOString();
    const creds: SyncVaultCredentials = {
      vaultId,
      passphrase,
      createdAt: nowStr,
      lastSyncedAt: nowStr,
      autoSync: true,
      deviceName,
      lastRemoteDevice: envelope.sourceDevice,
      lastRemoteUpdate: envelope.updatedAt,
    };
    this.saveCredentials(creds);

    return {
      success: true,
      pulledCount: importRes.dreamCount,
      newDreamsCount: importRes.newDreamsCount,
      pushedCount: mergedData.dreams.length,
      timestamp: nowStr,
    };
  },

  /**
   * Executes a two-way synchronization:
   * 1. Pulls remote encrypted envelope
   * 2. Decrypts and merges remote records into local IndexedDB
   * 3. Re-exports the complete union of dreams and re-encrypts
   * 4. Pushes back to cloud relay
   */
  async syncNow(): Promise<SyncResult> {
    if (activeSyncPromise) {
      return activeSyncPromise;
    }

    activeSyncPromise = (async () => {
      try {
        const creds = this.getCredentials();
        if (!creds || !creds.vaultId || !creds.passphrase) {
          throw new Error('No sync vault configured on this device.');
        }

        const getUrl = buildFreshUrl(getRelayUrl(creds.relayUrl, creds.vaultId));

        // 1. Pull remote envelope
        let getRes: Response;
        try {
          getRes = await fetch(getUrl, {
            method: 'GET',
            headers: NO_CACHE_HEADERS,
            cache: 'no-store',
          });
        } catch (networkErr: unknown) {
          throw new Error(
            `Failed to connect to cloud relay: ${
              networkErr instanceof Error ? networkErr.message : 'Network error'
            }.`
          );
        }

        if (!getRes.ok) {
          if (getRes.status === 404) {
            throw new Error(`Sync vault not found (${creds.vaultId}). Please check your Vault ID.`);
          }
          throw new Error(`Failed to connect to cloud relay (HTTP ${getRes.status}).`);
        }

        const remoteEnvelope = (await getRes.json()) as EncryptedSyncEnvelope;
        let pulledCount = 0;
        let newDreamsCount = 0;

        // 2. Decrypt remote data if present
        if (remoteEnvelope && remoteEnvelope.ciphertext && remoteEnvelope.salt && remoteEnvelope.iv) {
          let decrypted: BackupPayload;
          try {
            decrypted = await cryptoService.decryptData<BackupPayload>(
              remoteEnvelope,
              creds.passphrase
            );
          } catch {
            throw new Error('Encryption Passphrase does not match this vault. Please check your credentials in Settings.');
          }

          const validation = backupService.validateImportData(JSON.stringify(decrypted));
          if (!validation.valid || !validation.data) {
            throw new Error(`Remote vault data failed validation: ${validation.error || 'Invalid structure'}`);
          }

          const importRes = await backupService.importData(validation.data, 'merge');
          pulledCount = importRes.dreamCount;
          newDreamsCount = importRes.newDreamsCount;
        } else {
          throw new Error('Cloud vault returned an empty or malformed encrypted payload.');
        }

        // 3. Export complete union of local dreams
        const fullLocalData = await backupService.exportData();

        // 4. Encrypt full dataset with client-side Web Crypto
        const reEncrypted = await cryptoService.encryptData(fullLocalData, creds.passphrase);

        const newEnvelope: EncryptedSyncEnvelope = {
          version: 2,
          vaultId: creds.vaultId,
          salt: reEncrypted.salt,
          iv: reEncrypted.iv,
          ciphertext: reEncrypted.ciphertext,
          updatedAt: new Date().toISOString(),
          sourceDevice: creds.deviceName || 'Oneiric App',
        };

        // 5. Push back to relay
        const putUrl = getRelayUrl(creds.relayUrl, creds.vaultId);
        let putRes: Response;
        try {
          putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...NO_CACHE_HEADERS,
            },
            body: JSON.stringify(newEnvelope),
            cache: 'no-store',
          });
        } catch (networkErr: unknown) {
          throw new Error(
            `Failed to update cloud relay: ${
              networkErr instanceof Error ? networkErr.message : 'Network error'
            }.`
          );
        }

        if (!putRes.ok) {
          throw new Error(`Failed to update cloud relay (HTTP ${putRes.status}).`);
        }

        // 6. Update local credentials timestamp & remote device metadata
        const nowStr = new Date().toISOString();
        creds.lastSyncedAt = nowStr;
        if (remoteEnvelope?.sourceDevice) {
          creds.lastRemoteDevice = remoteEnvelope.sourceDevice;
        }
        if (remoteEnvelope?.updatedAt) {
          creds.lastRemoteUpdate = remoteEnvelope.updatedAt;
        }
        this.saveCredentials(creds);
        lastSyncError = null;
        autoSyncRetryCount = 0;
        this.notifyStatusChanged();

        return {
          success: true,
          pulledCount,
          newDreamsCount,
          pushedCount: fullLocalData.dreams.length,
          timestamp: nowStr,
        };
      } catch (err: unknown) {
        lastSyncError = err instanceof Error ? err.message : String(err);
        this.notifyStatusChanged();
        throw err;
      } finally {
        activeSyncPromise = null;
      }
    })();

    return activeSyncPromise;
  },

  /**
   * Updates auto-sync setting
   */
  setAutoSync(enabled: boolean): void {
    const creds = this.getCredentials();
    if (creds) {
      creds.autoSync = enabled;
      this.saveCredentials(creds);
    }
  },

  /**
   * Debounced auto-sync trigger to run after changes or window events
   */
  triggerAutoSync(options?: { immediate?: boolean }): void {
    const creds = this.getCredentials();
    if (!creds || !creds.autoSync) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    if (autoSyncTimeout) {
      clearTimeout(autoSyncTimeout);
      autoSyncTimeout = null;
    }

    const delay = options?.immediate ? 60 : 1500;
    autoSyncTimeout = setTimeout(async () => {
      try {
        await this.syncNow();
        autoSyncRetryCount = 0;
      } catch {
        console.warn('Background auto-sync failed. Retrying with exponential backoff...');
        if (autoSyncRetryCount < MAX_AUTO_SYNC_RETRIES) {
          autoSyncRetryCount++;
          const backoff = INITIAL_RETRY_BACKOFF_MS * Math.pow(2, autoSyncRetryCount - 1);
          autoSyncTimeout = setTimeout(() => {
            this.triggerAutoSync({ immediate: true });
          }, backoff);
        }
      }
    }, delay);
  },

  /**
   * Exports an encrypted transfer package string for direct device-to-device sharing
   */
  async exportEncryptedTransferCode(customPass?: string): Promise<{ code: string; passphrase: string }> {
    const passphrase = customPass?.trim() || cryptoService.generatePassphrase();
    const data = await backupService.exportData();
    const encrypted = await cryptoService.encryptData(data, passphrase);
    const code = btoa(JSON.stringify(encrypted));
    return { code, passphrase };
  },

  /**
   * Imports an encrypted transfer package string
   */
  async importEncryptedTransferCode(code: string, passphrase: string): Promise<number> {
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid transfer code: code cannot be empty.');
    }
    let jsonStr: string;
    try {
      jsonStr = atob(code.trim());
    } catch {
      throw new Error('Invalid transfer code: not a valid base64 encoded package.');
    }
    let envelope: { ciphertext: string; salt: string; iv: string };
    try {
      envelope = JSON.parse(jsonStr);
    } catch {
      throw new Error('Invalid transfer code: payload is not valid JSON.');
    }
    if (!envelope || !envelope.ciphertext || !envelope.salt || !envelope.iv) {
      throw new Error('Invalid transfer code: missing cryptographic envelope parameters.');
    }
    const decrypted = await cryptoService.decryptData<BackupPayload>(envelope, passphrase.trim());
    const validation = backupService.validateImportData(JSON.stringify(decrypted));
    if (!validation.valid || !validation.data) {
      throw new Error(`Transfer data invalid: ${validation.error}`);
    }
    const res = await backupService.importData(validation.data, 'merge');
    return res.dreamCount;
  },
};

// Auto-sync on window focus or tab visibility return
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncService.triggerAutoSync({ immediate: true });
    } else if (document.visibilityState === 'hidden') {
      if (autoSyncTimeout) {
        clearTimeout(autoSyncTimeout);
        autoSyncTimeout = null;
        syncService.syncNow().catch(() => {});
      }
    }
  });

  window.addEventListener('focus', () => {
    syncService.triggerAutoSync({ immediate: true });
  });

  window.addEventListener('online', () => {
    syncService.triggerAutoSync({ immediate: true });
    syncService.notifyStatusChanged();
  });

  window.addEventListener('offline', () => {
    syncService.notifyStatusChanged();
  });

  window.addEventListener('pagehide', () => {
    if (autoSyncTimeout) {
      clearTimeout(autoSyncTimeout);
      autoSyncTimeout = null;
      syncService.syncNow().catch(() => {});
    }
  });
}

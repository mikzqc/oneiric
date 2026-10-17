import { backupService } from './backupService';
import { cryptoService } from './cryptoService';
import {
  SyncVaultCredentials,
  EncryptedSyncEnvelope,
  SyncResult,
  SyncState,
} from '../types/sync';
import { BackupPayload } from '../types/backup';

const CREDENTIALS_STORAGE_KEY = 'oneiric_sync_vault';
const DEFAULT_RELAY_URL = 'https://extendsclass.com/api/json-storage/bin';

let autoSyncTimeout: ReturnType<typeof setTimeout> | null = null;

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
    return {
      status: 'idle',
      lastSyncedAt: creds?.lastSyncedAt || null,
      error: null,
      isConfigured: Boolean(creds?.vaultId && creds?.passphrase),
      vaultId: creds?.vaultId || null,
      autoSync: creds?.autoSync ?? true,
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
    const relayUrl = options?.relayUrl?.trim() || DEFAULT_RELAY_URL;
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

    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      throw new Error(`Failed to initialize cloud vault on relay (HTTP ${res.status}).`);
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

    const relayUrl = DEFAULT_RELAY_URL;
    const binUrl = `${relayUrl}/${vaultId}`;

    // 1. Pull encrypted envelope from cloud relay
    const res = await fetch(binUrl, { method: 'GET' });
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

    const putRes = await fetch(binUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEnvelope),
    });

    if (!putRes.ok) {
      throw new Error(`Failed to update cloud vault (HTTP ${putRes.status}).`);
    }

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

    return {
      success: true,
      pulledCount: importRes.dreamCount,
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
    const creds = this.getCredentials();
    if (!creds || !creds.vaultId || !creds.passphrase) {
      throw new Error('No sync vault configured on this device.');
    }

    const relayUrl = creds.relayUrl || DEFAULT_RELAY_URL;
    const binUrl = `${relayUrl}/${creds.vaultId}`;

    // 1. Pull remote envelope
    const getRes = await fetch(binUrl, { method: 'GET' });
    if (!getRes.ok) {
      throw new Error(`Failed to connect to cloud relay (HTTP ${getRes.status}).`);
    }

    const remoteEnvelope = (await getRes.json()) as EncryptedSyncEnvelope;
    let pulledCount = 0;

    // 2. Decrypt remote data if present
    if (remoteEnvelope && remoteEnvelope.ciphertext && remoteEnvelope.salt && remoteEnvelope.iv) {
      const decrypted = await cryptoService.decryptData<BackupPayload>(
        remoteEnvelope,
        creds.passphrase
      );

      const validation = backupService.validateImportData(JSON.stringify(decrypted));
      if (validation.valid && validation.data) {
        const importRes = await backupService.importData(validation.data, 'merge');
        pulledCount = importRes.dreamCount;
      }
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
    const putRes = await fetch(binUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEnvelope),
    });

    if (!putRes.ok) {
      throw new Error(`Failed to update cloud relay (HTTP ${putRes.status}).`);
    }

    // 6. Update local credentials timestamp
    const nowStr = new Date().toISOString();
    creds.lastSyncedAt = nowStr;
    this.saveCredentials(creds);

    return {
      success: true,
      pulledCount,
      pushedCount: fullLocalData.dreams.length,
      timestamp: nowStr,
    };
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
   * Debounced auto-sync trigger to run after changes
   */
  triggerAutoSync(): void {
    const creds = this.getCredentials();
    if (!creds || !creds.autoSync) return;

    if (autoSyncTimeout) {
      clearTimeout(autoSyncTimeout);
    }

    autoSyncTimeout = setTimeout(async () => {
      try {
        await this.syncNow();
      } catch (err) {
        console.warn('Background auto-sync failed:', err);
      }
    }, 4000);
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
    const jsonStr = atob(code.trim());
    const envelope = JSON.parse(jsonStr) as { ciphertext: string; salt: string; iv: string };
    const decrypted = await cryptoService.decryptData<BackupPayload>(envelope, passphrase.trim());
    const validation = backupService.validateImportData(JSON.stringify(decrypted));
    if (!validation.valid || !validation.data) {
      throw new Error(`Transfer data invalid: ${validation.error}`);
    }
    const res = await backupService.importData(validation.data, 'merge');
    return res.dreamCount;
  },
};

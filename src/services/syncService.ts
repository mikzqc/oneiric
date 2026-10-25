import { backupService } from './backupService';
import { cryptoService } from './cryptoService';
import {
  SyncVaultCredentials,
  EncryptedSyncEnvelope,
  SyncResult,
  SyncState,
  SyncedDevice,
  DeviceType,
  DecryptedSyncPayload,
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

export function detectDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildHeaders(deviceId?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  };
  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }
  return headers;
}

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

function formatRelayNetworkError(err: unknown, action = 'connect to'): string {
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const rawMsg = err instanceof Error ? err.message : '';
  const isNetworkFailure =
    isOffline ||
    /networkerror|failed to fetch|fetch failed|network request failed|load failed|connection refused|timeout/i.test(
      rawMsg
    );

  if (isNetworkFailure || isOffline) {
    return 'Unable to sync: You are currently offline. Please reconnect to Wi-Fi or the internet and try again.';
  }
  return `Unable to ${action} cloud sync relay: ${rawMsg || 'Network error'}. Please check your connection.`;
}

export const syncService = {
  /**
   * Retrieves saved sync vault credentials from local storage with automatic migration for device registry
   */
  getCredentials(): SyncVaultCredentials | null {
    try {
      const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (!raw) return null;
      const creds = JSON.parse(raw) as SyncVaultCredentials;
      let dirty = false;
      if (!creds.deviceId) {
        creds.deviceId = generateDeviceId();
        dirty = true;
      }
      if (!creds.deviceType) {
        creds.deviceType = detectDeviceType();
        dirty = true;
      }
      if (!Array.isArray(creds.revokedDeviceIds)) {
        creds.revokedDeviceIds = [];
        dirty = true;
      }
      if (!Array.isArray(creds.devices) || creds.devices.length === 0) {
        creds.devices = [
          {
            id: creds.deviceId,
            name: creds.deviceName || 'Primary Device',
            type: creds.deviceType,
            pairedAt: creds.createdAt || new Date().toISOString(),
            lastSyncAt: creds.lastSyncedAt || creds.createdAt || new Date().toISOString(),
            status: 'active',
          },
        ];
        dirty = true;
      }
      if (dirty) {
        localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
      }
      return creds;
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
   * Returns registered devices for this vault
   */
  getConnectedDevices(): SyncedDevice[] {
    const creds = this.getCredentials();
    if (!creds || !creds.devices) return [];
    return creds.devices;
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
    const deviceName = options?.deviceName?.trim() || 'Primary Device';
    const deviceId = generateDeviceId();
    const deviceType = detectDeviceType();
    const nowStr = new Date().toISOString();

    const initialDevice: SyncedDevice = {
      id: deviceId,
      name: deviceName,
      type: deviceType,
      pairedAt: nowStr,
      lastSyncAt: nowStr,
      status: 'active',
    };
    const devices: SyncedDevice[] = [initialDevice];
    const revokedDeviceIds: string[] = [];

    // 1. Export local journal data
    const localData = await backupService.exportData();

    // 2. Encrypt locally using client-side Web Crypto (AES-GCM-256)
    const payloadToEncrypt: DecryptedSyncPayload = {
      ...localData,
      devices,
      revokedDeviceIds,
    };
    const encrypted = await cryptoService.encryptData(payloadToEncrypt, passphrase);

    // 3. Post encrypted payload to cloud relay
    const envelope: Partial<EncryptedSyncEnvelope> = {
      version: 2,
      salt: encrypted.salt,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      updatedAt: nowStr,
      sourceDevice: deviceName,
      sourceDeviceId: deviceId,
      devices,
      revokedDeviceIds,
    };

    const targetUrl = getRelayUrl(relayUrl);
    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(deviceId),
        },
        body: JSON.stringify(envelope),
        cache: 'no-store',
      });
    } catch (networkErr: unknown) {
      throw new Error(formatRelayNetworkError(networkErr, 'initialize'));
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
    const creds: SyncVaultCredentials = {
      vaultId,
      passphrase,
      createdAt: nowStr,
      lastSyncedAt: nowStr,
      relayUrl,
      autoSync: true,
      deviceId,
      deviceName,
      deviceType,
      devices,
      revokedDeviceIds,
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

    const myDeviceId = generateDeviceId();
    const myDeviceType = detectDeviceType();
    const cleanDeviceName = deviceName.trim() || 'Secondary Device';

    const getUrl = buildFreshUrl(getRelayUrl(undefined, vaultId));

    // 1. Pull encrypted envelope from cloud relay
    let res: Response;
    try {
      res = await fetch(getUrl, {
        method: 'GET',
        headers: buildHeaders(myDeviceId),
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
      if (res.status === 403) {
        throw new Error('Sync Access Revoked: This device is not authorized to connect to this vault.');
      }
      if (res.status === 404) {
        throw new Error('Sync vault not found. Please verify the Vault ID.');
      }
      throw new Error(`Failed to fetch cloud vault (HTTP ${res.status}).`);
    }

    const envelope = (await res.json()) as EncryptedSyncEnvelope;
    if (!envelope || !envelope.ciphertext || !envelope.salt || !envelope.iv) {
      throw new Error('The cloud vault contains malformed encrypted data.');
    }

    // Outer envelope check
    if (Array.isArray(envelope.revokedDeviceIds) && envelope.revokedDeviceIds.includes(myDeviceId)) {
      throw new Error('Sync Access Revoked: This device has been revoked from this sync vault.');
    }

    // 2. Decrypt envelope using passphrase (validates authentication tag)
    const remoteData = await cryptoService.decryptData<DecryptedSyncPayload>(envelope, passphrase);

    // Inner payload check
    if (Array.isArray(remoteData.revokedDeviceIds) && remoteData.revokedDeviceIds.includes(myDeviceId)) {
      throw new Error('Sync Access Revoked: This device has been revoked from this sync vault.');
    }

    // 3. Validate decrypted backup schema
    const validation = backupService.validateImportData(JSON.stringify(remoteData));
    if (!validation.valid || !validation.data) {
      throw new Error(`Cloud vault data failed validation: ${validation.error}`);
    }

    // 4. Merge remote records into local IndexedDB
    const importRes = await backupService.importData(validation.data, 'merge');

    // 5. Update device registry with this new device
    const nowStr = new Date().toISOString();
    const existingDevices: SyncedDevice[] = remoteData.devices || envelope.devices || [];
    const thisDeviceRecord: SyncedDevice = {
      id: myDeviceId,
      name: cleanDeviceName,
      type: myDeviceType,
      pairedAt: nowStr,
      lastSyncAt: nowStr,
      status: 'active',
    };
    const updatedDevices: SyncedDevice[] = [
      ...existingDevices.filter((d) => d.id !== myDeviceId),
      thisDeviceRecord,
    ];
    const combinedRevokedIds = Array.from(
      new Set([...(remoteData.revokedDeviceIds || []), ...(envelope.revokedDeviceIds || [])])
    );

    // 6. Re-export merged dataset, encrypt, and push back to vault to ensure complete bidirectional sync
    const mergedData = await backupService.exportData();
    const payloadToEncrypt: DecryptedSyncPayload = {
      ...mergedData,
      devices: updatedDevices,
      revokedDeviceIds: combinedRevokedIds,
    };
    const updatedEncrypted = await cryptoService.encryptData(payloadToEncrypt, passphrase);

    const updatedEnvelope: EncryptedSyncEnvelope = {
      version: 2,
      vaultId,
      salt: updatedEncrypted.salt,
      iv: updatedEncrypted.iv,
      ciphertext: updatedEncrypted.ciphertext,
      updatedAt: nowStr,
      sourceDevice: cleanDeviceName,
      sourceDeviceId: myDeviceId,
      devices: updatedDevices,
      revokedDeviceIds: combinedRevokedIds,
    };

    const putUrl = getRelayUrl(undefined, vaultId);
    let putRes: Response;
    try {
      putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(myDeviceId),
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

    const creds: SyncVaultCredentials = {
      vaultId,
      passphrase,
      createdAt: nowStr,
      lastSyncedAt: nowStr,
      autoSync: true,
      deviceId: myDeviceId,
      deviceName: cleanDeviceName,
      deviceType: myDeviceType,
      lastRemoteDevice: envelope.sourceDevice,
      lastRemoteUpdate: envelope.updatedAt,
      devices: updatedDevices,
      revokedDeviceIds: combinedRevokedIds,
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

        const myDeviceId = creds.deviceId || generateDeviceId();
        if (creds.revokedDeviceIds?.includes(myDeviceId)) {
          throw new Error('Sync Access Revoked: This device has been removed from the sync vault.');
        }

        const getUrl = buildFreshUrl(getRelayUrl(creds.relayUrl, creds.vaultId));

        // 1. Pull remote envelope
        let getRes: Response;
        try {
          getRes = await fetch(getUrl, {
            method: 'GET',
            headers: buildHeaders(myDeviceId),
            cache: 'no-store',
          });
        } catch (networkErr: unknown) {
          throw new Error(formatRelayNetworkError(networkErr, 'connect to'));
        }

        if (!getRes.ok) {
          if (getRes.status === 403) {
            if (creds.devices) {
              const d = creds.devices.find((x) => x.id === myDeviceId);
              if (d) d.status = 'revoked';
            }
            if (!creds.revokedDeviceIds?.includes(myDeviceId)) {
              creds.revokedDeviceIds = [...(creds.revokedDeviceIds || []), myDeviceId];
            }
            this.saveCredentials(creds);
            throw new Error('Sync Access Revoked: This device has been removed from the sync vault.');
          }
          if (getRes.status === 404) {
            throw new Error(`Sync vault not found (${creds.vaultId}). Please check your Vault ID.`);
          }
          throw new Error(`Failed to connect to cloud relay (HTTP ${getRes.status}).`);
        }

        const remoteEnvelope = (await getRes.json()) as EncryptedSyncEnvelope;
        let pulledCount = 0;
        let newDreamsCount = 0;

        // Check envelope revokedDeviceIds
        if (
          Array.isArray(remoteEnvelope?.revokedDeviceIds) &&
          remoteEnvelope.revokedDeviceIds.includes(myDeviceId)
        ) {
          if (creds.devices) {
            const d = creds.devices.find((x) => x.id === myDeviceId);
            if (d) d.status = 'revoked';
          }
          if (!creds.revokedDeviceIds?.includes(myDeviceId)) {
            creds.revokedDeviceIds = [...(creds.revokedDeviceIds || []), myDeviceId];
          }
          this.saveCredentials(creds);
          throw new Error('Sync Access Revoked: This device has been removed from the sync vault.');
        }

        let remoteDevices: SyncedDevice[] = remoteEnvelope?.devices || [];
        let remoteRevokedIds: string[] = remoteEnvelope?.revokedDeviceIds || [];

        // 2. Decrypt remote data if present
        if (remoteEnvelope && remoteEnvelope.ciphertext && remoteEnvelope.salt && remoteEnvelope.iv) {
          let decrypted: DecryptedSyncPayload;
          try {
            decrypted = await cryptoService.decryptData<DecryptedSyncPayload>(
              remoteEnvelope,
              creds.passphrase
            );
          } catch {
            throw new Error(
              'Encryption Passphrase does not match this vault. Please check your credentials in Settings.'
            );
          }

          if (Array.isArray(decrypted.revokedDeviceIds) && decrypted.revokedDeviceIds.includes(myDeviceId)) {
            if (creds.devices) {
              const d = creds.devices.find((x) => x.id === myDeviceId);
              if (d) d.status = 'revoked';
            }
            if (!creds.revokedDeviceIds?.includes(myDeviceId)) {
              creds.revokedDeviceIds = [...(creds.revokedDeviceIds || []), myDeviceId];
            }
            this.saveCredentials(creds);
            throw new Error('Sync Access Revoked: This device has been removed from the sync vault.');
          }

          if (decrypted.devices) remoteDevices = decrypted.devices;
          if (decrypted.revokedDeviceIds) remoteRevokedIds = decrypted.revokedDeviceIds;

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

        // 3. Merge devices and revocation lists
        const nowStr = new Date().toISOString();
        const mergedRevokedIds = Array.from(
          new Set([...(creds.revokedDeviceIds || []), ...remoteRevokedIds])
        );

        const localDevicesMap = new Map<string, SyncedDevice>();
        (creds.devices || []).forEach((d) => localDevicesMap.set(d.id, { ...d }));
        remoteDevices.forEach((rd) => {
          const existing = localDevicesMap.get(rd.id);
          if (!existing) {
            localDevicesMap.set(rd.id, { ...rd });
          } else {
            const isRevoked = existing.status === 'revoked' || rd.status === 'revoked' || mergedRevokedIds.includes(rd.id);
            const latestSync = rd.lastSyncAt > existing.lastSyncAt ? rd.lastSyncAt : existing.lastSyncAt;
            localDevicesMap.set(rd.id, {
              ...existing,
              ...rd,
              status: isRevoked ? 'revoked' : 'active',
              lastSyncAt: latestSync,
            });
          }
        });

        // Update current device's heartbeat
        const currentDev = localDevicesMap.get(myDeviceId) || {
          id: myDeviceId,
          name: creds.deviceName || 'Primary Device',
          type: creds.deviceType || detectDeviceType(),
          pairedAt: creds.createdAt || nowStr,
          lastSyncAt: nowStr,
          status: 'active' as const,
        };
        currentDev.lastSyncAt = nowStr;
        currentDev.status = 'active';
        localDevicesMap.set(myDeviceId, currentDev);

        const mergedDevices = Array.from(localDevicesMap.values());

        // 4. Export complete union of local dreams
        const fullLocalData = await backupService.exportData();

        // 5. Encrypt full dataset with client-side Web Crypto
        const payloadToEncrypt: DecryptedSyncPayload = {
          ...fullLocalData,
          devices: mergedDevices,
          revokedDeviceIds: mergedRevokedIds,
        };
        const reEncrypted = await cryptoService.encryptData(payloadToEncrypt, creds.passphrase);

        const newEnvelope: EncryptedSyncEnvelope = {
          version: 2,
          vaultId: creds.vaultId,
          salt: reEncrypted.salt,
          iv: reEncrypted.iv,
          ciphertext: reEncrypted.ciphertext,
          updatedAt: nowStr,
          sourceDevice: creds.deviceName || 'Oneiric App',
          sourceDeviceId: myDeviceId,
          devices: mergedDevices,
          revokedDeviceIds: mergedRevokedIds,
        };

        // 6. Push back to relay
        const putUrl = getRelayUrl(creds.relayUrl, creds.vaultId);
        let putRes: Response;
        try {
          putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...buildHeaders(myDeviceId),
            },
            body: JSON.stringify(newEnvelope),
            cache: 'no-store',
          });
        } catch (networkErr: unknown) {
          throw new Error(formatRelayNetworkError(networkErr, 'update'));
        }

        if (!putRes.ok) {
          if (putRes.status === 403) {
            throw new Error('Sync Access Revoked: This device has been removed from the sync vault.');
          }
          throw new Error(`Failed to update cloud relay (HTTP ${putRes.status}).`);
        }

        // 7. Update local credentials timestamp & remote device metadata
        creds.lastSyncedAt = nowStr;
        creds.devices = mergedDevices;
        creds.revokedDeviceIds = mergedRevokedIds;
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
   * Revokes a paired device's access to this sync vault
   */
  async revokeDevice(targetDeviceId: string): Promise<void> {
    const creds = this.getCredentials();
    if (!creds || !creds.vaultId || !creds.passphrase) {
      throw new Error('No sync vault configured on this device.');
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error(
        'Unable to revoke device while offline. Please connect to the internet so the revocation can be published to the sync vault.'
      );
    }

    if (!targetDeviceId || typeof targetDeviceId !== 'string') {
      throw new Error('Invalid device ID specified for revocation.');
    }

    if (targetDeviceId === creds.deviceId) {
      throw new Error(
        'Cannot remove the current device from the device list. To disconnect this device, use Disconnect Vault below.'
      );
    }

    // Check if caller device is revoked
    if (creds.revokedDeviceIds?.includes(creds.deviceId || '')) {
      throw new Error('Unauthorized: This device has been revoked and cannot modify vault permissions.');
    }

    const nowStr = new Date().toISOString();
    const updatedDevices: SyncedDevice[] = (creds.devices || []).map((dev) => {
      if (dev.id === targetDeviceId) {
        return {
          ...dev,
          status: 'revoked' as const,
          revokedAt: nowStr,
        };
      }
      return dev;
    });

    const updatedRevokedIds = Array.from(
      new Set([...(creds.revokedDeviceIds || []), targetDeviceId])
    );

    // Save locally first
    creds.devices = updatedDevices;
    creds.revokedDeviceIds = updatedRevokedIds;
    this.saveCredentials(creds);

    // Immediately push to cloud relay so the relay updates revokedDeviceIds and denies future access
    try {
      await this.syncNow();
    } catch (syncErr: unknown) {
      throw new Error(
        `Device revocation was recorded locally, but failed to publish to the cloud vault: ${
          syncErr instanceof Error ? syncErr.message : 'Network error'
        }. Please verify your connection.`
      );
    }
  },

  /**
   * Re-keys the sync vault to provide 100% cryptographic forward secrecy against revoked devices
   */
  async rotateVaultKey(options?: {
    newPassphrase?: string;
  }): Promise<{ vaultId: string; passphrase: string; unifiedKey: string }> {
    const creds = this.getCredentials();
    if (!creds || !creds.vaultId) {
      throw new Error('No sync vault configured to re-key.');
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error(
        'Unable to rotate vault key while offline. Please connect to the internet and try again.'
      );
    }

    const newPassphrase = options?.newPassphrase?.trim() || cryptoService.generatePassphrase();
    const deviceName = creds.deviceName || 'Primary Device';
    const relayUrl = creds.relayUrl;

    // Create fresh vault with new key, carrying over dreams but leaving revoked devices behind
    const result = await this.createVault({
      passphrase: newPassphrase,
      deviceName,
      relayUrl,
    });

    return result;
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

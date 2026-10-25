import { BackupPayload } from './backup';

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

export interface SyncedDevice {
  id: string;
  name: string;
  type: DeviceType;
  pairedAt: string;
  lastSyncAt: string;
  status: 'active' | 'revoked';
  revokedAt?: string;
}

export interface SyncVaultCredentials {
  vaultId: string;
  passphrase: string;
  createdAt: string;
  lastSyncedAt?: string;
  relayUrl?: string;
  autoSync: boolean;
  deviceId?: string;
  deviceName?: string;
  deviceType?: DeviceType;
  lastRemoteDevice?: string;
  lastRemoteUpdate?: string;
  devices?: SyncedDevice[];
  revokedDeviceIds?: string[];
}

export interface EncryptedSyncEnvelope {
  version: number;
  vaultId: string;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: string;
  sourceDevice?: string;
  sourceDeviceId?: string;
  revokedDeviceIds?: string[];
  devices?: SyncedDevice[];
}

export type SyncStatusState = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncState {
  status: SyncStatusState;
  lastSyncedAt: string | null;
  error: string | null;
  isConfigured: boolean;
  vaultId: string | null;
  autoSync: boolean;
  lastRemoteDevice?: string | null;
  lastRemoteUpdate?: string | null;
  isOnline?: boolean;
  retryAttempt?: number;
}

export interface SyncResult {
  success: boolean;
  pulledCount: number;
  newDreamsCount: number;
  pushedCount: number;
  timestamp: string;
  error?: string;
}

export interface DecryptedSyncPayload extends BackupPayload {
  lastModified?: string;
  devices?: SyncedDevice[];
  revokedDeviceIds?: string[];
}

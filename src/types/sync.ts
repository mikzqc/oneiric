import { BackupPayload } from './backup';

export interface SyncVaultCredentials {
  vaultId: string;
  passphrase: string;
  createdAt: string;
  lastSyncedAt?: string;
  relayUrl?: string;
  autoSync: boolean;
  deviceName?: string;
}

export interface EncryptedSyncEnvelope {
  version: number;
  vaultId: string;
  salt: string;
  iv: string;
  ciphertext: string;
  updatedAt: string;
  sourceDevice?: string;
}

export type SyncStatusState = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncState {
  status: SyncStatusState;
  lastSyncedAt: string | null;
  error: string | null;
  isConfigured: boolean;
  vaultId: string | null;
  autoSync: boolean;
}

export interface SyncResult {
  success: boolean;
  pulledCount: number;
  pushedCount: number;
  timestamp: string;
  error?: string;
}

export interface DecryptedSyncPayload extends BackupPayload {
  lastModified?: string;
}

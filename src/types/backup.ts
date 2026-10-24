import { DreamEntry } from './dream';
import { TechniqueLog } from './technique';
import { DreamSign } from './dreamSign';

export interface CustomTag {
  id: string;
  name: string;
  createdAt: number;
}

export interface BackupPayload {
  version: 1 | 2;
  exportedAt: string; // ISO 8601
  source: 'oneiric';
  dreams: DreamEntry[];
  techniqueLogs: TechniqueLog[];
  customTags?: CustomTag[];
  dreamSigns?: DreamSign[];
  deletedIds?: string[];
  tombstones?: Record<string, number>; // ID -> deletion timestamp for deterministic conflict resolution
}

export interface EncryptedBackupEnvelope {
  version: 1 | 2;
  source: 'oneiric';
  encrypted: true;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  exportedAt: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  data?: BackupPayload;
  stats?: {
    dreamCount: number;
    lucidCount: number;
    techniqueCount: number;
    dreamSignCount?: number;
    falseAwakeningCount?: number;
  };
}

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

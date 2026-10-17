export type DreamSignCategory =
  | 'person'
  | 'location'
  | 'object'
  | 'action'
  | 'anomaly'
  | 'emotion'
  | 'other';

export type DreamSignStatus = 'confirmed' | 'suggested' | 'dismissed';

export interface DreamSign {
  id: string;
  name: string;
  category: DreamSignCategory;
  keywords: string[]; // normalized search terms and aliases
  status: DreamSignStatus;
  userNotes?: string;
  isRealityCheckReminder?: boolean;
  linkedDreamIds: string[];
  excludedDreamIds?: string[]; // Dreams explicitly unlinked by the user from this sign
  distinctDreamCount: number; // Must be distinct dream records!
  lastOccurred?: string; // YYYY-MM-DD
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type DreamSignDraft = Omit<DreamSign, 'id' | 'createdAt' | 'updatedAt'>;

export interface DetectedSignCandidate {
  name: string;
  category: DreamSignCategory;
  matchedKeywords: string[];
  matchedDreamIds: string[];
  distinctCount: number;
  lastDate?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DreamDumpNote {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isConverted?: boolean;
  convertedToDreamId?: string;
}

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

import { DreamEntry } from '../types/dream';
import { tombstoneService } from './tombstones';

export interface TrashedDream {
  dream: DreamEntry;
  deletedAt: number;
}

const TRASH_STORAGE_KEY = 'oneiric_dream_trash';
const TRASH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days retention

export const trashService = {
  getTrash(): TrashedDream[] {
    try {
      const raw = localStorage.getItem(TRASH_STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw) as TrashedDream[];
      if (!Array.isArray(list)) return [];
      const now = Date.now();
      // Auto-prune items older than 30 days
      const valid = list.filter((item) => now - item.deletedAt < TRASH_MAX_AGE_MS);
      if (valid.length !== list.length) {
        localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(valid));
      }
      return valid.sort((a, b) => b.deletedAt - a.deletedAt);
    } catch {
      return [];
    }
  },

  moveToTrash(dream: DreamEntry): void {
    if (!dream || !dream.id) return;
    try {
      const current = this.getTrash().filter((item) => item.dream.id !== dream.id);
      current.unshift({
        dream,
        deletedAt: Date.now(),
      });
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(current));
      tombstoneService.recordDeletion(dream.id);
      window.dispatchEvent(new CustomEvent('oneiric:trash-changed'));
    } catch {
      // ignore
    }
  },

  getTrashedDream(id: string): TrashedDream | undefined {
    return this.getTrash().find((item) => item.dream.id === id);
  },

  restoreDream(id: string): DreamEntry | undefined {
    try {
      const current = this.getTrash();
      const target = current.find((item) => item.dream.id === id);
      if (!target) return undefined;

      const remaining = current.filter((item) => item.dream.id !== id);
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(remaining));
      tombstoneService.removeTombstone(id);
      window.dispatchEvent(new CustomEvent('oneiric:trash-changed'));
      return target.dream;
    } catch {
      return undefined;
    }
  },

  permanentlyDelete(id: string): void {
    try {
      const remaining = this.getTrash().filter((item) => item.dream.id !== id);
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(remaining));
      tombstoneService.recordDeletion(id);
      window.dispatchEvent(new CustomEvent('oneiric:trash-changed'));
    } catch {
      // ignore
    }
  },

  emptyTrash(): void {
    try {
      const current = this.getTrash();
      for (const item of current) {
        tombstoneService.recordDeletion(item.dream.id);
      }
      localStorage.removeItem(TRASH_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('oneiric:trash-changed'));
    } catch {
      // ignore
    }
  },
};

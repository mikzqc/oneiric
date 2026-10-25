import { DreamEntry } from '../types/dream';
import { tombstoneService } from './tombstones';

export interface TrashedDream {
  dream: DreamEntry;
  deletedAt: number;
}

const TRASH_STORAGE_KEY = 'oneiric_dream_trash';
export const TRASH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days retention

// In-memory fallback if localStorage is disabled, throws, or quota is exceeded
let memoryTrashFallback: TrashedDream[] = [];

function isValidTrashedDream(item: unknown): item is TrashedDream {
  return Boolean(
    item &&
      typeof item === 'object' &&
      'dream' in item &&
      item.dream &&
      typeof item.dream === 'object' &&
      'id' in item.dream &&
      typeof item.dream.id === 'string' &&
      'deletedAt' in item &&
      typeof item.deletedAt === 'number' &&
      !isNaN(item.deletedAt)
  );
}

export const trashService = {
  getTrash(): TrashedDream[] {
    const now = Date.now();
    let storedList: TrashedDream[] = [];

    try {
      const raw = localStorage.getItem(TRASH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storedList = parsed.filter(isValidTrashedDream);
        }
      }
    } catch {
      storedList = [];
    }

    // Merge with in-memory fallback (deduplicating by dream.id)
    const storedIds = new Set(storedList.map((item) => item.dream.id));
    const merged = [
      ...storedList,
      ...memoryTrashFallback.filter((item) => !storedIds.has(item.dream.id) && isValidTrashedDream(item)),
    ];

    // Auto-prune items older than 30 days
    const valid = merged.filter((item) => now - item.deletedAt < TRASH_MAX_AGE_MS);

    // If pruning occurred, persist back to localStorage safely
    if (valid.length !== storedList.length) {
      try {
        localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(valid));
      } catch {
        // ignore write failure
      }
    }

    // Also update in-memory fallback to keep it fresh
    memoryTrashFallback = valid;

    return valid.sort((a, b) => b.deletedAt - a.deletedAt);
  },

  moveToTrash(dream: DreamEntry): void {
    if (!dream || !dream.id) return;
    const now = Date.now();
    const entry: TrashedDream = {
      dream,
      deletedAt: now,
    };

    // Always preserve in memory fallback first
    memoryTrashFallback = [entry, ...memoryTrashFallback.filter((item) => item.dream.id !== dream.id)];

    try {
      const current = this.getTrash().filter((item) => item.dream.id !== dream.id);
      current.unshift(entry);

      // Attempt to save to localStorage
      try {
        localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(current));
      } catch {
        // QuotaExceededError or storage error: iteratively prune oldest items to make room
        while (current.length > 1) {
          current.pop();
          try {
            localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(current));
            break;
          } catch {
            // continue popping oldest until it fits
          }
        }
      }

      tombstoneService.recordDeletion(dream.id, now);

      try {
        window.dispatchEvent(
          new CustomEvent('oneiric:trash-changed', {
            detail: { dream, deletedAt: now },
          })
        );
        window.dispatchEvent(
          new CustomEvent('oneiric:dream-trashed', {
            detail: { dream, deletedAt: now },
          })
        );
      } catch {
        // ignore non-browser environments
      }
    } catch {
      tombstoneService.recordDeletion(dream.id, now);
      try {
        window.dispatchEvent(
          new CustomEvent('oneiric:trash-changed', {
            detail: { dream, deletedAt: now },
          })
        );
        window.dispatchEvent(
          new CustomEvent('oneiric:dream-trashed', {
            detail: { dream, deletedAt: now },
          })
        );
      } catch {
        // ignore
      }
    }
  },

  getTrashedDream(id: string): TrashedDream | undefined {
    return this.getTrash().find((item) => item.dream.id === id);
  },

  restoreDream(id: string): DreamEntry | undefined {
    try {
      const current = this.getTrash();
      const target =
        current.find((item) => item.dream.id === id) ||
        memoryTrashFallback.find((item) => item.dream.id === id);

      if (!target) return undefined;

      const remaining = current.filter((item) => item.dream.id !== id);
      memoryTrashFallback = memoryTrashFallback.filter((item) => item.dream.id !== id);

      try {
        localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(remaining));
      } catch {
        // ignore
      }

      tombstoneService.removeTombstone(id);

      // Refresh updatedAt to current time so remote syncing recognizes dream as updated after deletion
      const restoredDream: DreamEntry = {
        ...target.dream,
        updatedAt: Math.max(Date.now(), (target.dream.updatedAt || 0) + 1),
      };

      try {
        window.dispatchEvent(
          new CustomEvent('oneiric:trash-changed', {
            detail: { restoredId: id, dream: restoredDream },
          })
        );
      } catch {
        // ignore
      }

      return restoredDream;
    } catch {
      return undefined;
    }
  },

  permanentlyDelete(id: string): void {
    try {
      const remaining = this.getTrash().filter((item) => item.dream.id !== id);
      memoryTrashFallback = memoryTrashFallback.filter((item) => item.dream.id !== id);

      try {
        localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(remaining));
      } catch {
        // ignore
      }

      tombstoneService.recordDeletion(id);

      try {
        window.dispatchEvent(
          new CustomEvent('oneiric:trash-changed', {
            detail: { permanentlyDeletedId: id },
          })
        );
      } catch {
        // ignore
      }
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
      for (const item of memoryTrashFallback) {
        tombstoneService.recordDeletion(item.dream.id);
      }

      memoryTrashFallback = [];
      try {
        localStorage.removeItem(TRASH_STORAGE_KEY);
      } catch {
        // ignore
      }

      try {
        window.dispatchEvent(
          new CustomEvent('oneiric:trash-changed', {
            detail: { empty: true },
          })
        );
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  },

  /**
   * Completely clears all trash storage and memory without recording tombstones (for factory reset / wipeAllData)
   */
  clearAllTrash(): void {
    memoryTrashFallback = [];
    try {
      localStorage.removeItem(TRASH_STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent('oneiric:trash-changed', {
          detail: { cleared: true },
        })
      );
    } catch {
      // ignore
    }
  },

  clearMemoryFallback(): void {
    memoryTrashFallback = [];
  },
};

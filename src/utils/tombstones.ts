const TOMBSTONES_STORAGE_KEY = 'oneiric_sync_tombstones';
const TOMBSTONE_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export const tombstoneService = {
  /**
   * Retrieves map of deleted item IDs and their deletion timestamps
   */
  getTombstonesMap(): Record<string, number> {
    try {
      const raw = localStorage.getItem(TOMBSTONES_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  },

  /**
   * Records a deleted record ID to prevent resurrection during sync
   */
  recordDeletion(id: string): void {
    if (!id) return;
    try {
      const map = this.getTombstonesMap();
      map[id] = Date.now();
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  },

  /**
   * Records multiple deleted record IDs
   */
  recordDeletions(ids: string[]): void {
    if (!ids || ids.length === 0) return;
    try {
      const map = this.getTombstonesMap();
      const now = Date.now();
      for (const id of ids) {
        if (id) map[id] = map[id] || now;
      }
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  },

  /**
   * Checks if an ID has been marked as deleted
   */
  isDeleted(id: string): boolean {
    if (!id) return false;
    const map = this.getTombstonesMap();
    return Boolean(map[id]);
  },

  /**
   * Returns list of currently tracked deleted IDs, pruning entries older than 60 days
   */
  getDeletedIds(): string[] {
    try {
      const map = this.getTombstonesMap();
      const now = Date.now();
      const validIds: string[] = [];
      let pruned = false;

      for (const [id, timestamp] of Object.entries(map)) {
        if (now - timestamp < TOMBSTONE_MAX_AGE_MS) {
          validIds.push(id);
        } else {
          delete map[id];
          pruned = true;
        }
      }

      if (pruned) {
        localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(map));
      }

      return validIds;
    } catch {
      return [];
    }
  },

  /**
   * Clears tombstones on full data reset
   */
  clearTombstones(): void {
    try {
      localStorage.removeItem(TOMBSTONES_STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

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
   * Records a deleted record ID to prevent resurrection during sync.
   * Optionally accepts a specific timestamp; defaults to Date.now().
   */
  recordDeletion(id: string, timestamp?: number): void {
    if (!id) return;
    try {
      const map = this.getTombstonesMap();
      const ts = timestamp || Date.now();
      map[id] = Math.max(map[id] || 0, ts);
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  },

  /**
   * Records multiple deleted record IDs
   */
  recordDeletions(ids: string[], timestamp?: number): void {
    if (!ids || ids.length === 0) return;
    try {
      const map = this.getTombstonesMap();
      const now = timestamp || Date.now();
      for (const id of ids) {
        if (id) map[id] = Math.max(map[id] || 0, now);
      }
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  },

  /**
   * Merges an incoming tombstone map with local tombstones, preserving the newest timestamps
   */
  mergeTombstones(incoming: Record<string, number>): void {
    if (!incoming || typeof incoming !== 'object') return;
    try {
      const map = this.getTombstonesMap();
      for (const [id, ts] of Object.entries(incoming)) {
        if (id && typeof ts === 'number') {
          map[id] = Math.max(map[id] || 0, ts);
        }
      }
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  },

  /**
   * Returns the deletion timestamp for a given ID, or null if not deleted
   */
  getDeletionTimestamp(id: string): number | null {
    if (!id) return null;
    const map = this.getTombstonesMap();
    return typeof map[id] === 'number' ? map[id] : null;
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
   * Removes a tombstone when a record is restored from trash or updated after deletion
   */
  removeTombstone(id: string): void {
    if (!id) return;
    try {
      const map = this.getTombstonesMap();
      if (map[id]) {
        delete map[id];
        localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(map));
      }
    } catch {
      // ignore
    }
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

import { db } from '../db/database';

export interface LucidCelebrationEvent {
  isFirstLucid: boolean;
  lucidCount: number;
  dreamTitle?: string;
  dreamId?: string;
  isDevPreview?: boolean;
}

export interface AchievementHistoryRecord {
  firstLucidAchievedAt?: number;
  totalLucidCelebrations: number;
  lastCelebratedAt?: number;
}

const ACHIEVEMENT_HISTORY_KEY = 'oneiric_achievement_history';
const CELEBRATION_EVENT_NAME = 'oneiric:lucid-celebration';

// In-memory subscribers for immediate UI updates
const subscribers = new Set<(event: LucidCelebrationEvent) => void>();

function loadHistory(): AchievementHistoryRecord {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    totalLucidCelebrations: 0,
  };
}

function saveHistory(record: AchievementHistoryRecord): void {
  try {
    localStorage.setItem(ACHIEVEMENT_HISTORY_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export const celebrationService = {
  /**
   * Derives how many active, non-deleted qualifying lucid dream entries currently exist in the database.
   */
  async getQualifyingLucidCount(): Promise<number> {
    try {
      return await db.dreams.where('lucidity').equals('lucid').count();
    } catch {
      return 0;
    }
  },

  /**
   * Determines whether saving this entry should trigger a celebration,
   * whether it counts as the first lucid dream, and what the resulting lucid count is.
   */
  async checkCelebrationEligibility(
    isNewEntry: boolean,
    targetLucidity: string
  ): Promise<{ shouldCelebrate: boolean; isFirstLucid: boolean; lucidCount: number }> {
    // Editing an existing entry never triggers a celebration
    if (!isNewEntry) {
      return { shouldCelebrate: false, isFirstLucid: false, lucidCount: 0 };
    }

    if (targetLucidity !== 'lucid') {
      return { shouldCelebrate: false, isFirstLucid: false, lucidCount: 0 };
    }

    const currentCount = await this.getQualifyingLucidCount();
    const isFirstLucid = currentCount === 0;
    const lucidCount = currentCount + 1;

    return {
      shouldCelebrate: true,
      isFirstLucid,
      lucidCount,
    };
  },

  /**
   * Triggers the full-screen celebration event.
   */
  triggerCelebration(event: LucidCelebrationEvent): void {
    // If not a developer preview, record genuine achievement history
    if (!event.isDevPreview) {
      const history = loadHistory();
      history.totalLucidCelebrations = (history.totalLucidCelebrations || 0) + 1;
      history.lastCelebratedAt = Date.now();
      if (event.isFirstLucid && !history.firstLucidAchievedAt) {
        history.firstLucidAchievedAt = Date.now();
      }
      saveHistory(history);
    }

    // Broadcast in-memory
    subscribers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('Error notifying celebration subscriber:', err);
      }
    });

    // Broadcast DOM custom event
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CELEBRATION_EVENT_NAME, { detail: event }));
      }
    } catch {
      // ignore
    }
  },

  /**
   * Subscribes to celebration events. Returns an unsubscribe cleanup function.
   */
  subscribeToCelebration(callback: (event: LucidCelebrationEvent) => void): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },

  /**
   * Safe developer preview trigger. Does not alter real database records or achievement counts.
   */
  triggerDevPreview(isFirstLucid: boolean): void {
    const previewEvent: LucidCelebrationEvent = {
      isFirstLucid,
      lucidCount: isFirstLucid ? 1 : 4,
      dreamTitle: isFirstLucid
        ? 'First Awakening: Flying Over the Mountains'
        : 'Lucid Exploration of the Obsidian Citadel',
      isDevPreview: true,
    };
    this.triggerCelebration(previewEvent);
  },

  /**
   * Get current achievement history record.
   */
  getAchievementHistory(): AchievementHistoryRecord {
    return loadHistory();
  },

  /**
   * Clear achievement history (for test fixtures / resets).
   */
  resetAchievementHistory(): void {
    try {
      localStorage.removeItem(ACHIEVEMENT_HISTORY_KEY);
    } catch {
      // ignore
    }
  },
};

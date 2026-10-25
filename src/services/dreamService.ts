import { db } from '../db/database';
import { DreamDraft, DreamEntry } from '../types/dream';
import { calculateJournalingStreak, getLastNDays, getTodayDateString, parseLocalDate } from '../utils/dateUtils';
import { dreamSignService } from './dreamSignService';
import { syncService } from './syncService';
import { tombstoneService } from '../utils/tombstones';
import { trashService, TrashedDream } from '../utils/trashService';

export type { TrashedDream };

export interface TimelineNightGroup {
  date: string;
  dreams: DreamEntry[];
  techniques: import('../types/technique').TechniqueLog[];
  hasLucid: boolean;
  hasFalseAwakening: boolean;
  maxVividness: number;
}

export type RecallRange = '1w' | '2w' | '3w' | '1m' | 'all';

export interface RecallChartDataPoint {
  date: string;
  label: string;
  fullLabel: string;
  count: number;
  lucidCount: number;
}

export function calculateRecallChartData(
  allDreams: { date: string; lucidity: string }[],
  range: RecallRange = '1w',
  referenceDate: Date = new Date()
): RecallChartDataPoint[] {
  let days = 7;
  if (range === '2w') {
    days = 14;
  } else if (range === '3w') {
    days = 21;
  } else if (range === '1m') {
    days = 30;
  } else if (range === 'all') {
    if (allDreams.length > 0) {
      const dates = allDreams.map((d) => d.date).filter(Boolean).sort();
      if (dates.length > 0) {
        const earliest = parseLocalDate(dates[0]);
        const today = parseLocalDate(getTodayDateString(referenceDate));
        const diffDays = Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        days = Math.max(7, Math.min(diffDays, 365 * 5));
      }
    }
  }

  const daysList = getLastNDays(days, referenceDate);
  const dateLookup = new Map<string, { total: number; lucid: number }>();
  for (const day of daysList) {
    dateLookup.set(day.dateStr, { total: 0, lucid: 0 });
  }

  for (const dream of allDreams) {
    const entry = dateLookup.get(dream.date);
    if (entry) {
      entry.total += 1;
      if (dream.lucidity === 'lucid') {
        entry.lucid += 1;
      }
    }
  }

  return daysList.map((d) => {
    const stats = dateLookup.get(d.dateStr) || { total: 0, lucid: 0 };
    return {
      date: d.dateStr,
      label: range === '1w' ? d.dayOfWeek : d.label,
      fullLabel: range === '1w' ? d.label : d.dayOfWeek,
      count: stats.total,
      lucidCount: stats.lucid,
    };
  });
}

export const dreamService = {
  async getAllDreams(): Promise<DreamEntry[]> {
    return await db.dreams.orderBy('date').reverse().toArray();
  },

  async getDreamById(id: string): Promise<DreamEntry | undefined> {
    return await db.dreams.get(id);
  },

  async createDream(draft: DreamDraft): Promise<DreamEntry> {
    const now = Date.now();
    const entry: DreamEntry = {
      ...draft,
      id: crypto.randomUUID ? crypto.randomUUID() : `dream-${now}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    await db.dreams.add(entry);

    // Also persist any new custom tags to the customTags table
    if (draft.tags && draft.tags.length > 0) {
      for (const tag of draft.tags) {
        const trimmed = tag.trim();
        if (trimmed) {
          const existing = await db.customTags.where('name').equalsIgnoreCase(trimmed).first();
          if (!existing) {
            await db.customTags.add({
              id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: trimmed,
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    // Trigger dream signs update in background
    dreamSignService.scanAndDetectSigns().catch(() => {});

    // Trigger immediate cloud sync in background if configured
    syncService.triggerAutoSync({ immediate: true });

    try {
      window.dispatchEvent(new CustomEvent('oneiric:dream-saved', { detail: entry }));
    } catch {
      // ignore
    }

    return entry;
  },

  async updateDream(id: string, updates: Partial<DreamDraft>): Promise<void> {
    const existing = await db.dreams.get(id);
    if (!existing) {
      throw new Error(`Dream with id "${id}" not found.`);
    }

    await db.dreams.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    if (updates.tags && updates.tags.length > 0) {
      for (const tag of updates.tags) {
        const trimmed = tag.trim();
        if (trimmed) {
          const exists = await db.customTags.where('name').equalsIgnoreCase(trimmed).first();
          if (!exists) {
            await db.customTags.add({
              id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: trimmed,
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    // Trigger dream signs update in background
    dreamSignService.scanAndDetectSigns().catch(() => {});

    // Trigger immediate cloud sync in background if configured
    syncService.triggerAutoSync({ immediate: true });

    try {
      window.dispatchEvent(new CustomEvent('oneiric:dream-saved', { detail: { id, ...updates } }));
    } catch {
      // ignore
    }
  },

  async deleteDream(id: string): Promise<void> {
    const dream = await db.dreams.get(id);
    if (dream) {
      trashService.moveToTrash(dream);
    } else {
      tombstoneService.recordDeletion(id);
    }
    await db.dreams.delete(id);
    // Trigger dream signs update in background
    dreamSignService.scanAndDetectSigns().catch(() => {});

    // Trigger immediate cloud sync in background if configured
    syncService.triggerAutoSync({ immediate: true });

    try {
      window.dispatchEvent(new CustomEvent('oneiric:dream-saved', { detail: { id, deleted: true } }));
    } catch {
      // ignore
    }
  },

  async restoreFromTrash(id: string): Promise<DreamEntry | undefined> {
    const dream = trashService.restoreDream(id);
    if (!dream) {
      const existing = await db.dreams.get(id);
      if (existing) return existing;
      return undefined;
    }
    await db.dreams.put(dream);
    dreamSignService.scanAndDetectSigns().catch(() => {});
    syncService.triggerAutoSync({ immediate: true });
    try {
      window.dispatchEvent(new CustomEvent('oneiric:dream-saved', { detail: dream }));
    } catch {
      // ignore
    }
    return dream;
  },

  getTrash(): TrashedDream[] {
    return trashService.getTrash();
  },

  permanentlyDeleteFromTrash(id: string): void {
    trashService.permanentlyDelete(id);
    syncService.triggerAutoSync({ immediate: true });
    try {
      window.dispatchEvent(new CustomEvent('oneiric:dream-saved', { detail: { id, permanentlyDeleted: true } }));
    } catch {
      // ignore
    }
  },

  emptyTrash(): void {
    trashService.emptyTrash();
    syncService.triggerAutoSync({ immediate: true });
    try {
      window.dispatchEvent(new CustomEvent('oneiric:dream-saved', { detail: { emptyTrash: true } }));
    } catch {
      // ignore
    }
  },

  async getLucidDreams(): Promise<DreamEntry[]> {
    return await db.dreams.where('lucidity').equals('lucid').reverse().sortBy('date');
  },

  async getFalseAwakeningDreams(): Promise<DreamEntry[]> {
    return await db.dreams.filter((d) => !!d.falseAwakening).reverse().sortBy('date');
  },

  async getDreamsByDate(dateStr: string): Promise<DreamEntry[]> {
    return await db.dreams.where('date').equals(dateStr).toArray();
  },

  async getDistinctTags(): Promise<string[]> {
    const allDreams = await db.dreams.toArray();
    const customTags = await db.customTags.toArray();
    const tagSet = new Set<string>();

    for (const dream of allDreams) {
      if (Array.isArray(dream.tags)) {
        dream.tags.forEach((t) => tagSet.add(t));
      }
    }
    for (const ct of customTags) {
      tagSet.add(ct.name);
    }

    return Array.from(tagSet).sort();
  },

  async getDashboardStats(referenceDate: Date = new Date(), recallRange: RecallRange = '1w') {
    const allDreams = await db.dreams.toArray();
    const totalDreams = allDreams.length;
    const totalLucid = allDreams.filter((d) => d.lucidity === 'lucid').length;
    const totalFalseAwakenings = allDreams.filter((d) => !!d.falseAwakening).length;

    // 7-day recall calculations for weekly summary metric
    const last7Days = getLastNDays(7, referenceDate);
    const last7DaysSet = new Set(last7Days.map((d) => d.dateStr));
    let weeklyDreams = 0;
    for (const dream of allDreams) {
      if (last7DaysSet.has(dream.date)) {
        weeklyDreams += 1;
      }
    }

    const recallChartData = calculateRecallChartData(allDreams, recallRange, referenceDate);

    // Journaling streak calculation
    const recordedDates = allDreams.map((d) => d.date);
    const currentStreak = calculateJournalingStreak(recordedDates, referenceDate);

    // Recent dreams sorted by date descending, then createdAt descending
    const recentDreams = [...allDreams]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      .slice(0, 5);

    return {
      totalDreams,
      totalLucid,
      totalFalseAwakenings,
      weeklyDreams,
      currentStreak,
      recentDreams,
      recallChartData,
      hasEntries: totalDreams > 0,
      todayRecorded: recordedDates.includes(getTodayDateString(referenceDate)),
    };
  },

  async getRecallChartData(range: RecallRange = '1w', referenceDate: Date = new Date()): Promise<RecallChartDataPoint[]> {
    const allDreams = await db.dreams.toArray();
    return calculateRecallChartData(allDreams, range, referenceDate);
  },

  /**
   * Generates chronological nocturnal timeline events grouped by date
   */
  async getTimelineEvents(): Promise<TimelineNightGroup[]> {
    const [dreams, techniques] = await Promise.all([
      db.dreams.toArray(),
      db.techniqueLogs.toArray(),
    ]);

    // Group by date
    const nightsMap = new Map<string, { dreams: DreamEntry[]; techniques: import('../types/technique').TechniqueLog[] }>();

    for (const dream of dreams) {
      if (!nightsMap.has(dream.date)) {
        nightsMap.set(dream.date, { dreams: [], techniques: [] });
      }
      nightsMap.get(dream.date)!.dreams.push(dream);
    }

    for (const tech of techniques) {
      if (!nightsMap.has(tech.date)) {
        nightsMap.set(tech.date, { dreams: [], techniques: [] });
      }
      nightsMap.get(tech.date)!.techniques.push(tech);
    }

    const sortedDates = Array.from(nightsMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((date) => {
      const data = nightsMap.get(date)!;
      // Sort dreams by createdAt if available
      data.dreams.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      const hasLucid = data.dreams.some((d) => d.lucidity === 'lucid');
      const hasFalseAwakening = data.dreams.some((d) => !!d.falseAwakening);
      const maxVividness = data.dreams.length > 0 ? Math.max(...data.dreams.map((d) => d.vividness || 0)) : 0;

      return {
        date,
        dreams: data.dreams,
        techniques: data.techniques,
        hasLucid,
        hasFalseAwakening,
        maxVividness,
      };
    });
  },
};

import { db } from '../db/database';
import { TechniqueDraft, TechniqueLog } from '../types/technique';
import { syncService } from './syncService';
import { tombstoneService } from '../utils/tombstones';

export interface TechniqueComparisonStat {
  technique: string;
  sampleSize: number; // Must clearly show sample size!
  lucidCount: number;
  lucidRate: number; // %
  recalledCount: number;
  recallRate: number; // %
  noRecallCount: number;
  averageConfidence: number | null;
}

export const techniqueService = {
  async getAllLogs(): Promise<TechniqueLog[]> {
    return await db.techniqueLogs.orderBy('date').reverse().toArray();
  },

  async createLog(draft: TechniqueDraft): Promise<TechniqueLog> {
    const now = Date.now();
    const entry: TechniqueLog = {
      ...draft,
      id: crypto.randomUUID ? crypto.randomUUID() : `tech-${now}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    await db.techniqueLogs.add(entry);
    syncService.triggerAutoSync({ immediate: true });
    return entry;
  },

  async deleteLog(id: string): Promise<void> {
    tombstoneService.recordDeletion(id);
    await db.techniqueLogs.delete(id);
    syncService.triggerAutoSync({ immediate: true });
  },

  async getTechniqueStats() {
    const logs = await db.techniqueLogs.toArray();
    const totalAttempts = logs.length;
    const lucidCount = logs.filter((l) => l.outcome === 'lucid_dream').length;
    const recalledCount = logs.filter((l) => l.outcome === 'dream_recalled').length;
    const noRecallCount = logs.filter((l) => l.outcome === 'no_recall').length;

    const byTechniqueMap: Record<
      string,
      { total: number; lucid: number; recalled: number; noRecall: number; confidences: number[] }
    > = {};

    for (const log of logs) {
      const techKey = log.technique === 'Other' && log.customTechniqueName ? log.customTechniqueName : log.technique;
      if (!byTechniqueMap[techKey]) {
        byTechniqueMap[techKey] = { total: 0, lucid: 0, recalled: 0, noRecall: 0, confidences: [] };
      }
      byTechniqueMap[techKey].total += 1;
      if (log.outcome === 'lucid_dream') byTechniqueMap[techKey].lucid += 1;
      else if (log.outcome === 'dream_recalled') byTechniqueMap[techKey].recalled += 1;
      else byTechniqueMap[techKey].noRecall += 1;

      if (typeof log.confidenceRating === 'number' && log.confidenceRating > 0) {
        byTechniqueMap[techKey].confidences.push(log.confidenceRating);
      }
    }

    const comparisons: TechniqueComparisonStat[] = Object.entries(byTechniqueMap).map(([tech, data]) => {
      const sampleSize = data.total;
      const lucidRate = sampleSize > 0 ? Math.round((data.lucid / sampleSize) * 100) : 0;
      const recallRate = sampleSize > 0 ? Math.round(((data.lucid + data.recalled) / sampleSize) * 100) : 0;
      const avgConfidence =
        data.confidences.length > 0
          ? Number((data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length).toFixed(1))
          : null;

      return {
        technique: tech,
        sampleSize,
        lucidCount: data.lucid,
        lucidRate,
        recalledCount: data.recalled,
        recallRate,
        noRecallCount: data.noRecall,
        averageConfidence: avgConfidence,
      };
    });

    // Sort by sample size descending
    comparisons.sort((a, b) => b.sampleSize - a.sampleSize);

    return {
      totalAttempts,
      lucidCount,
      recalledCount,
      noRecallCount,
      lucidRate: totalAttempts > 0 ? Math.round((lucidCount / totalAttempts) * 100) : 0,
      overallRecallRate: totalAttempts > 0 ? Math.round(((lucidCount + recalledCount) / totalAttempts) * 100) : 0,
      comparisons,
    };
  },
};

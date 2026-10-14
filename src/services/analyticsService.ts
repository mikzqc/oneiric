import { db } from '../db/database';
import { LucidityLevel } from '../types/dream';
import { getTodayDateString, parseLocalDate } from '../utils/dateUtils';

export type TimeRangeFilter = '7d' | '30d' | '90d' | '1y' | 'all';

export interface EmotionStat {
  emotion: string;
  count: number;
  percentage: number;
}

export interface TagStat {
  tag: string;
  count: number;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  lucidCount: number;
  falseAwakeningCount: number;
}

export interface AnalyticsSummary {
  timeRange: TimeRangeFilter;
  totalDreams: number;
  totalLucid: number;
  lucidityRate: number; // %
  totalFalseAwakenings: number;
  averageVividness: number;
  averageDreamControl: number | null;
  recallRate: number; // percentage of days with at least 1 dream recorded
  calendarDaysCount: number;
  recordedDaysCount: number;
  emotions: EmotionStat[];
  topTags: TagStat[];
  weeklyComparison: {
    thisWeek: number;
    lastWeek: number;
    difference: number;
  };
  monthlyComparison: {
    thisMonth: number;
    lastMonth: number;
    difference: number;
  };
  recallTimeline: {
    date: string;
    label: string;
    total: number;
    lucid: number;
    controlAvg: number | null;
  }[];
  heatmap: HeatmapDay[];
}

export const analyticsService = {
  async getAnalytics(
    timeRange: TimeRangeFilter = '30d',
    lucidityFilter: 'all' | LucidityLevel = 'all',
    referenceDate: Date = new Date()
  ): Promise<AnalyticsSummary> {
    const allDreams = await db.dreams.toArray();

    // Determine date boundary
    const todayStr = getTodayDateString(referenceDate);
    const startDateObj = new Date(referenceDate);

    let daysInPeriod = 30;
    if (timeRange === '7d') daysInPeriod = 7;
    else if (timeRange === '30d') daysInPeriod = 30;
    else if (timeRange === '90d') daysInPeriod = 90;
    else if (timeRange === '1y') daysInPeriod = 365;
    else if (timeRange === 'all') {
      if (allDreams.length > 0) {
        const sortedDates = allDreams.map((d) => d.date).sort();
        const earliest = parseLocalDate(sortedDates[0]);
        const diffMs = referenceDate.getTime() - earliest.getTime();
        daysInPeriod = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1, 1);
      } else {
        daysInPeriod = 1;
      }
    }

    startDateObj.setDate(startDateObj.getDate() - (daysInPeriod - 1));
    const startDateStr = getTodayDateString(startDateObj);

    // Filter dreams within selected time range and optional lucidity filter
    const periodDreams = allDreams.filter((d) => {
      const inDate = timeRange === 'all' ? true : d.date >= startDateStr && d.date <= todayStr;
      if (!inDate) return false;
      if (lucidityFilter !== 'all' && d.lucidity !== lucidityFilter) return false;
      return true;
    });

    const totalDreams = periodDreams.length;
    const totalLucid = periodDreams.filter((d) => d.lucidity === 'lucid').length;
    const totalFalseAwakenings = periodDreams.filter((d) => !!d.falseAwakening).length;

    const lucidityRate = totalDreams > 0 ? Math.round((totalLucid / totalDreams) * 100) : 0;

    // Vividness average
    const totalVividness = periodDreams.reduce((acc, d) => acc + (d.vividness || 0), 0);
    const averageVividness = totalDreams > 0 ? Number((totalVividness / totalDreams).toFixed(1)) : 0;

    // Dream control average (only for dreams that recorded control)
    const dreamsWithControl = periodDreams.filter((d) => typeof d.dreamControl === 'number' && d.dreamControl > 0);
    const averageDreamControl =
      dreamsWithControl.length > 0
        ? Number(
            (
              dreamsWithControl.reduce((acc, d) => acc + (d.dreamControl || 0), 0) /
              dreamsWithControl.length
            ).toFixed(1)
          )
        : null;

    // Unique recorded days
    const recordedDaysSet = new Set(periodDreams.map((d) => d.date));
    const recordedDaysCount = recordedDaysSet.size;
    const recallRate = daysInPeriod > 0 ? Math.min(100, Math.round((recordedDaysCount / daysInPeriod) * 100)) : 0;

    // Emotion frequencies
    const emotionCounts: Record<string, number> = {};
    for (const dream of periodDreams) {
      if (Array.isArray(dream.emotions)) {
        for (const emo of dream.emotions) {
          emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
        }
      }
    }
    const emotions: EmotionStat[] = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: totalDreams > 0 ? Math.round((count / totalDreams) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Tag frequencies
    const tagCounts: Record<string, number> = {};
    for (const dream of periodDreams) {
      if (Array.isArray(dream.tags)) {
        for (const tag of dream.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    const topTags: TagStat[] = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Weekly Comparison: this week (last 7 days) vs previous week (days 8-14 ago)
    const d7 = new Date(referenceDate);
    d7.setDate(d7.getDate() - 6);
    const d14 = new Date(referenceDate);
    d14.setDate(d14.getDate() - 13);
    const d7Str = getTodayDateString(d7);
    const d14Str = getTodayDateString(d14);

    const thisWeekDreams = allDreams.filter((d) => d.date >= d7Str && d.date <= todayStr).length;
    const lastWeekDreams = allDreams.filter((d) => d.date >= d14Str && d.date < d7Str).length;

    // Monthly Comparison: this month (last 30 days) vs previous 30 days
    const d30 = new Date(referenceDate);
    d30.setDate(d30.getDate() - 29);
    const d60 = new Date(referenceDate);
    d60.setDate(d60.getDate() - 59);
    const d30Str = getTodayDateString(d30);
    const d60Str = getTodayDateString(d60);

    const thisMonthDreams = allDreams.filter((d) => d.date >= d30Str && d.date <= todayStr).length;
    const lastMonthDreams = allDreams.filter((d) => d.date >= d60Str && d.date < d30Str).length;

    // Daily Timeline Data for Charts
    const dayMap = new Map<string, { total: number; lucid: number; controls: number[] }>();

    // Prepare day slots (limit timeline to max 30 points for readability if long period)
    const timelineDaysCount = Math.min(daysInPeriod, 30);
    for (let i = timelineDaysCount - 1; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      const str = getTodayDateString(d);
      dayMap.set(str, { total: 0, lucid: 0, controls: [] });
    }

    for (const dream of periodDreams) {
      const entry = dayMap.get(dream.date);
      if (entry) {
        entry.total += 1;
        if (dream.lucidity === 'lucid') entry.lucid += 1;
        if (typeof dream.dreamControl === 'number' && dream.dreamControl > 0) {
          entry.controls.push(dream.dreamControl);
        }
      }
    }

    const recallTimeline = Array.from(dayMap.entries()).map(([dateStr, data]) => {
      const dObj = parseLocalDate(dateStr);
      const label = dObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      const avgCtrl =
        data.controls.length > 0
          ? Number((data.controls.reduce((a, b) => a + b, 0) / data.controls.length).toFixed(1))
          : null;
      return {
        date: dateStr,
        label,
        total: data.total,
        lucid: data.lucid,
        controlAvg: avgCtrl,
      };
    });

    // Heatmap data (consistently spans the past 90 days)
    const heatmapDaysCount = 90;
    const heatmapMap = new Map<string, { count: number; lucidCount: number; falseAwakeningCount: number }>();

    for (let i = heatmapDaysCount - 1; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - i);
      const str = getTodayDateString(d);
      heatmapMap.set(str, { count: 0, lucidCount: 0, falseAwakeningCount: 0 });
    }

    for (const dream of allDreams) {
      const entry = heatmapMap.get(dream.date);
      if (entry) {
        entry.count += 1;
        if (dream.lucidity === 'lucid') entry.lucidCount += 1;
        if (dream.falseAwakening) entry.falseAwakeningCount += 1;
      }
    }

    const heatmap: HeatmapDay[] = Array.from(heatmapMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      lucidCount: data.lucidCount,
      falseAwakeningCount: data.falseAwakeningCount,
    }));

    return {
      timeRange,
      totalDreams,
      totalLucid,
      lucidityRate,
      totalFalseAwakenings,
      averageVividness,
      averageDreamControl,
      recallRate,
      calendarDaysCount: daysInPeriod,
      recordedDaysCount,
      emotions,
      topTags,
      weeklyComparison: {
        thisWeek: thisWeekDreams,
        lastWeek: lastWeekDreams,
        difference: thisWeekDreams - lastWeekDreams,
      },
      monthlyComparison: {
        thisMonth: thisMonthDreams,
        lastMonth: lastMonthDreams,
        difference: thisMonthDreams - lastMonthDreams,
      },
      recallTimeline,
      heatmap,
    };
  },
};

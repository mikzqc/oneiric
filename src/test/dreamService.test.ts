import { describe, it, expect, beforeEach } from 'vitest';
import { dreamService, calculateRecallChartData } from '../services/dreamService';
import { db } from '../db/database';
import { calculateJournalingStreak } from '../utils/dateUtils';

describe('dreamService & Streak Calculations', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.customTags.clear();
  });

  it('creates and retrieves a dream entry correctly', async () => {
    const created = await dreamService.createDream({
      title: 'Testing Gravity Distortion',
      narrative: 'I jumped from a building and floated softly down like a feather.',
      date: '2026-10-14',
      wakeUpTime: '07:00',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      emotions: ['Wonder', 'Joy'],
      tags: ['Flying'],
      dreamSignsNotes: 'Floating gravity sensation was the trigger.',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Testing Gravity Distortion');

    const fetched = await dreamService.getDreamById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.lucidity).toBe('lucid');
    expect(fetched?.vividness).toBe(4);
  });

  it('updates an existing dream entry', async () => {
    const created = await dreamService.createDream({
      title: 'Original Title',
      narrative: 'Narrative content',
      date: '2026-10-10',
      vividness: 2,
      recallQuality: 'hazy',
      lucidity: 'non-lucid',
      emotions: ['Confusion'],
      tags: ['Test'],
    });

    await dreamService.updateDream(created.id, {
      title: 'Updated Celestial Title',
      lucidity: 'lucid',
      vividness: 5,
    });

    const updated = await dreamService.getDreamById(created.id);
    expect(updated?.title).toBe('Updated Celestial Title');
    expect(updated?.lucidity).toBe('lucid');
    expect(updated?.vividness).toBe(5);
  });

  it('deletes a dream entry', async () => {
    const created = await dreamService.createDream({
      title: 'To Be Deleted',
      narrative: 'Ephemeral dream',
      date: '2026-10-09',
      vividness: 1,
      recallQuality: 'hazy',
      lucidity: 'non-lucid',
      emotions: [],
      tags: [],
    });

    await dreamService.deleteDream(created.id);
    const fetched = await dreamService.getDreamById(created.id);
    expect(fetched).toBeUndefined();
  });

  it('calculates journaling streaks accurately', () => {
    const refDate = new Date(2026, 9, 14); // 2026-10-14

    // Consecutive 4 days ending today
    const datesToday = ['2026-10-14', '2026-10-13', '2026-10-12', '2026-10-11'];
    expect(calculateJournalingStreak(datesToday, refDate)).toBe(4);

    // Consecutive 3 days ending yesterday (user hasn't logged today yet)
    const datesYesterday = ['2026-10-13', '2026-10-12', '2026-10-11'];
    expect(calculateJournalingStreak(datesYesterday, refDate)).toBe(3);

    // Broken streak (last entry was 2 days ago)
    const datesBroken = ['2026-10-12', '2026-10-11', '2026-10-10'];
    expect(calculateJournalingStreak(datesBroken, refDate)).toBe(0);

    // Empty dates
    expect(calculateJournalingStreak([], refDate)).toBe(0);

    // Duplicate dates on the same day shouldn't inflate streak
    const datesDuplicates = ['2026-10-14', '2026-10-14', '2026-10-13', '2026-10-13'];
    expect(calculateJournalingStreak(datesDuplicates, refDate)).toBe(2);
  });

  describe('Recall Activity Chart Ranges', () => {
    const mockDreams = [
      { date: '2026-10-14', lucidity: 'lucid' },
      { date: '2026-10-14', lucidity: 'non-lucid' },
      { date: '2026-10-10', lucidity: 'lucid' },
      { date: '2026-09-20', lucidity: 'non-lucid' },
    ];
    const refDate = new Date(2026, 9, 14); // 2026-10-14

    it('generates 7 data points for 1w with weekday labels', () => {
      const data = calculateRecallChartData(mockDreams, '1w', refDate);
      expect(data).toHaveLength(7);
      expect(data[data.length - 1].date).toBe('2026-10-14');
      expect(data[data.length - 1].count).toBe(2);
      expect(data[data.length - 1].lucidCount).toBe(1);
      // For 1w, label is weekday, fullLabel is M/D date
      expect(data[data.length - 1].label).toBe('Wed');
    });

    it('generates 14 data points for 2w, 21 for 3w, and 30 data points for 1m', () => {
      const data2w = calculateRecallChartData(mockDreams, '2w', refDate);
      expect(data2w).toHaveLength(14);
      expect(data2w[data2w.length - 1].date).toBe('2026-10-14');
      // For 2w, label is M/D date, fullLabel is weekday
      expect(data2w[data2w.length - 1].fullLabel).toBe('Wed');

      const data3w = calculateRecallChartData(mockDreams, '3w', refDate);
      expect(data3w).toHaveLength(21);
      expect(data3w[data3w.length - 1].date).toBe('2026-10-14');
      expect(data3w[data3w.length - 1].fullLabel).toBe('Wed');

      const data1m = calculateRecallChartData(mockDreams, '1m', refDate);
      expect(data1m).toHaveLength(30);
      expect(data1m[data1m.length - 1].date).toBe('2026-10-14');
    });

    it('generates all-time span covering earliest recorded dream date', () => {
      const dataAll = calculateRecallChartData(mockDreams, 'all', refDate);
      // From 2026-09-20 to 2026-10-14 is 25 days inclusive
      expect(dataAll.length).toBe(25);
      expect(dataAll[0].date).toBe('2026-09-20');
      expect(dataAll[dataAll.length - 1].date).toBe('2026-10-14');
      expect(dataAll[0].count).toBe(1);
    });

    it('retrieves recall chart data from db using getRecallChartData and getDashboardStats', async () => {
      await dreamService.createDream({
        title: 'Recent Lucid Dream',
        narrative: 'Testing chart data retrieval',
        date: '2026-10-14',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Joy'],
        tags: [],
      });

      const chartData2w = await dreamService.getRecallChartData('2w', refDate);
      expect(chartData2w).toHaveLength(14);
      expect(chartData2w[chartData2w.length - 1].count).toBe(1);
      expect(chartData2w[chartData2w.length - 1].lucidCount).toBe(1);

      const stats1m = await dreamService.getDashboardStats(refDate, '1m');
      expect(stats1m.recallChartData).toHaveLength(30);
    });
  });
});

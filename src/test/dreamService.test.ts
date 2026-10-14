import { describe, it, expect, beforeEach } from 'vitest';
import { dreamService } from '../services/dreamService';
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
});

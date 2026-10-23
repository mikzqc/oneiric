import { describe, it, expect, beforeEach, vi } from 'vitest';
import { celebrationService, LucidCelebrationEvent } from '../services/celebrationService';
import { dreamService } from '../services/dreamService';
import { backupService } from '../services/backupService';
import { db } from '../db/database';

describe('Lucid Dream Celebration & Party Mode Service', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.customTags.clear();
    celebrationService.resetAchievementHistory();
    celebrationService.setSubsequentCelebrationEnabled(true);
    localStorage.clear();
  });

  it('detects first lucid dream when no prior lucid dreams exist in DB', async () => {
    const eligibility = await celebrationService.checkCelebrationEligibility(true, 'lucid');
    expect(eligibility.shouldCelebrate).toBe(true);
    expect(eligibility.isFirstLucid).toBe(true);
    expect(eligibility.lucidCount).toBe(1);
  });

  it('does not celebrate when dream is non-lucid or uncertain', async () => {
    const nonLucid = await celebrationService.checkCelebrationEligibility(true, 'non-lucid');
    expect(nonLucid.shouldCelebrate).toBe(false);

    const uncertain = await celebrationService.checkCelebrationEligibility(true, 'uncertain');
    expect(uncertain.shouldCelebrate).toBe(false);
  });

  it('never celebrates when editing an existing entry, even if lucid', async () => {
    const editCheck = await celebrationService.checkCelebrationEligibility(false, 'lucid');
    expect(editCheck.shouldCelebrate).toBe(false);
    expect(editCheck.isFirstLucid).toBe(false);
    expect(editCheck.lucidCount).toBe(0);
  });

  it('correctly increments lucid count for subsequent lucid dreams', async () => {
    // Save first lucid dream
    await dreamService.createDream({
      title: 'First Awareness',
      narrative: 'I realized my hands had six fingers and took flight.',
      date: '2026-10-10',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      emotions: ['Joy'],
      tags: ['Flying'],
    });

    const eligibility = await celebrationService.checkCelebrationEligibility(true, 'lucid');
    expect(eligibility.shouldCelebrate).toBe(true);
    expect(eligibility.isFirstLucid).toBe(false);
    expect(eligibility.lucidCount).toBe(2);
  });

  it('allows disabling subsequent celebrations in settings while keeping first-lucid celebration active', async () => {
    // Disable subsequent celebrations
    celebrationService.setSubsequentCelebrationEnabled(false);
    expect(celebrationService.isSubsequentCelebrationEnabled()).toBe(false);

    // First lucid dream should STILL celebrate
    const firstCheck = await celebrationService.checkCelebrationEligibility(true, 'lucid');
    expect(firstCheck.shouldCelebrate).toBe(true);
    expect(firstCheck.isFirstLucid).toBe(true);

    // Create the first lucid dream in DB
    await dreamService.createDream({
      title: 'First Flight',
      narrative: 'Floating softly.',
      date: '2026-10-10',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      emotions: ['Joy'],
      tags: [],
    });

    // Subsequent lucid dream should now be SILENCED
    const subsequentCheck = await celebrationService.checkCelebrationEligibility(true, 'lucid');
    expect(subsequentCheck.shouldCelebrate).toBe(false);
    expect(subsequentCheck.isFirstLucid).toBe(false);

    // Re-enable in settings
    celebrationService.setSubsequentCelebrationEnabled(true);
    expect(celebrationService.isSubsequentCelebrationEnabled()).toBe(true);

    // Now subsequent lucid dream celebrates again
    const reEnabledCheck = await celebrationService.checkCelebrationEligibility(true, 'lucid');
    expect(reEnabledCheck.shouldCelebrate).toBe(true);
    expect(reEnabledCheck.isFirstLucid).toBe(false);
    expect(reEnabledCheck.lucidCount).toBe(2);
  });

  it('resets first-lucid eligibility if the only lucid dream is deleted, but not if others remain', async () => {
    // 1. Create first lucid dream
    const dream1 = await dreamService.createDream({
      title: 'First Flight',
      narrative: 'Floating above the city rooftops.',
      date: '2026-10-10',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      emotions: ['Awe'],
      tags: ['Flying'],
    });

    expect(await celebrationService.getQualifyingLucidCount()).toBe(1);

    // 2. Delete the only lucid dream
    await dreamService.deleteDream(dream1.id);
    expect(await celebrationService.getQualifyingLucidCount()).toBe(0);

    // 3. Next lucid dream should regain first-lucid celebration eligibility
    const resetEligibility = await celebrationService.checkCelebrationEligibility(true, 'lucid');
    expect(resetEligibility.shouldCelebrate).toBe(true);
    expect(resetEligibility.isFirstLucid).toBe(true);
    expect(resetEligibility.lucidCount).toBe(1);

    // 4. Create two lucid dreams
    const _dream2 = await dreamService.createDream({
      title: 'Regained First Lucid',
      narrative: 'Testing lucid state again.',
      date: '2026-10-11',
      vividness: 5,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      emotions: ['Triumph'],
      tags: ['Flight'],
    });

    const dream3 = await dreamService.createDream({
      title: 'Second Lucid Dream',
      narrative: 'Changing colors of the sky.',
      date: '2026-10-12',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      emotions: ['Clarity'],
      tags: ['Control'],
    });

    expect(await celebrationService.getQualifyingLucidCount()).toBe(2);

    // 5. Delete one entry (dream3) while dream2 remains
    await dreamService.deleteDream(dream3.id);
    expect(await celebrationService.getQualifyingLucidCount()).toBe(1);

    // 6. First-lucid eligibility must NOT be restored since dream2 still exists!
    const subsequentEligibility = await celebrationService.checkCelebrationEligibility(true, 'lucid');
    expect(subsequentEligibility.shouldCelebrate).toBe(true);
    expect(subsequentEligibility.isFirstLucid).toBe(false);
    expect(subsequentEligibility.lucidCount).toBe(2);
  });

  it('notifies subscribers and broadcasts DOM CustomEvents when celebration triggers', () => {
    const receivedEvents: LucidCelebrationEvent[] = [];
    const unsubscribe = celebrationService.subscribeToCelebration((evt) => {
      receivedEvents.push(evt);
    });

    const domHandler = vi.fn();
    window.addEventListener('oneiric:lucid-celebration', domHandler);

    celebrationService.triggerCelebration({
      isFirstLucid: true,
      lucidCount: 1,
      dreamTitle: 'Soaring through Starlight',
      dreamId: 'dream-123',
    });

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].isFirstLucid).toBe(true);
    expect(receivedEvents[0].lucidCount).toBe(1);
    expect(receivedEvents[0].dreamTitle).toBe('Soaring through Starlight');
    expect(domHandler).toHaveBeenCalledTimes(1);

    // Unsubscribe cleanly
    unsubscribe();
    window.removeEventListener('oneiric:lucid-celebration', domHandler);

    celebrationService.triggerCelebration({
      isFirstLucid: false,
      lucidCount: 2,
    });

    expect(receivedEvents).toHaveLength(1);
    expect(domHandler).toHaveBeenCalledTimes(1);
  });

  it('supports developer preview without modifying real achievement history', () => {
    const receivedEvents: LucidCelebrationEvent[] = [];
    const unsubscribe = celebrationService.subscribeToCelebration((evt) => {
      receivedEvents.push(evt);
    });

    // Initial genuine achievement history is empty
    expect(celebrationService.getAchievementHistory().totalLucidCelebrations).toBe(0);

    // Trigger first-lucid dev preview
    celebrationService.triggerDevPreview(true);
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].isFirstLucid).toBe(true);
    expect(receivedEvents[0].isDevPreview).toBe(true);

    // Achievement history should NOT be corrupted by preview
    expect(celebrationService.getAchievementHistory().totalLucidCelebrations).toBe(0);

    // Trigger subsequent-lucid dev preview
    celebrationService.triggerDevPreview(false);
    expect(receivedEvents).toHaveLength(2);
    expect(receivedEvents[1].isFirstLucid).toBe(false);
    expect(receivedEvents[1].isDevPreview).toBe(true);

    // Still unpolluted
    expect(celebrationService.getAchievementHistory().totalLucidCelebrations).toBe(0);

    unsubscribe();
  });

  it('does NOT trigger celebration when importing a JSON backup containing lucid dreams', async () => {
    const celebrationListener = vi.fn();
    const unsubscribe = celebrationService.subscribeToCelebration(celebrationListener);

    const backupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      dreams: [
        {
          id: 'imported-lucid-1',
          title: 'Imported Lucid Dream Experience',
          narrative: 'Realized I was dreaming during a flight scene.',
          date: '2026-09-01',
          lucidity: 'lucid' as const,
          vividness: 5,
          recallQuality: 'crystal' as const,
          emotions: ['Elation'],
          tags: ['Imported', 'Lucid'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      techniqueLogs: [],
      customTags: [],
    };

    // Import into DB via backupService
    await backupService.importData(backupPayload, 'merge');

    // Verify dream is in DB
    const count = await celebrationService.getQualifyingLucidCount();
    expect(count).toBe(1);

    // Verify celebration was NOT triggered
    expect(celebrationListener).not.toHaveBeenCalled();

    unsubscribe();
  });
});

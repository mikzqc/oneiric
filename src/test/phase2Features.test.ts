import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { dreamService } from '../services/dreamService';
import { dreamSignService } from '../services/dreamSignService';
import { techniqueService } from '../services/techniqueService';
import { analyticsService } from '../services/analyticsService';
import { DreamDraft } from '../types/dream';
import { TechniqueDraft } from '../types/technique';

describe('Phase 2: Dream Intelligence & Pattern Analysis Suite', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.dreamSigns.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
  });

  describe('Dream Sign Detection & Distinct Entry Counting', () => {
    it('does NOT suggest a pattern if a term appears 10 times in only 1 dream', async () => {
      // Rule: "A word repeated ten times in one dream should not count as ten separate dreams."
      const singleDreamWithRepetition: DreamDraft = {
        title: 'Clocks Everywhere',
        narrative: 'A grandfather clock, digital clock, tower clock, wall clock, pocket clock, desk clock, antique clock, ticking clock, gold clock, water clock.',
        date: '2026-10-10',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Confusion'],
        tags: ['Objects'],
      };

      await dreamService.createDream(singleDreamWithRepetition);
      await dreamSignService.scanAndDetectSigns();
      const allSigns = await dreamSignService.getAllSigns();

      // "clock" only appeared in 1 distinct dream, so it MUST NOT be suggested as a recurring sign
      const clockCandidate = allSigns.find((c) => c.name.toLowerCase().includes('clock'));
      expect(clockCandidate).toBeUndefined();
    });

    it('suggests a sign candidate when appearing across 2 or more distinct dreams', async () => {
      const dream1: DreamDraft = {
        title: 'Ocean flight',
        narrative: 'I was hovering over an endless ocean at dusk.',
        date: '2026-10-10',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Awe'],
        tags: ['Water'],
      };

      const dream2: DreamDraft = {
        title: 'Deep dive',
        narrative: 'The ocean waves were crystal clear and filled with bioluminescence.',
        date: '2026-10-12',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Curiosity'],
        tags: ['Water'],
      };

      await dreamService.createDream(dream1);
      await dreamService.createDream(dream2);

      await dreamSignService.scanAndDetectSigns();
      const suggested = await dreamSignService.getSuggestedSigns();
      const oceanCandidate = suggested.find((c) => c.name.toLowerCase().includes('ocean'));

      expect(oceanCandidate).toBeDefined();
      expect(oceanCandidate?.distinctDreamCount).toBe(2);
      expect(oceanCandidate?.linkedDreamIds.length).toBe(2);
    });

    it('allows confirming, dismissing, and merging detected signs', async () => {
      const signA = await dreamSignService.createSign({
        name: 'Mirror',
        category: 'object',
        keywords: ['mirror', 'glass'],
        notes: 'Reflections look warped',
        isRealityCheckReminder: true,
      });

      const signB = await dreamSignService.createSign({
        name: 'Looking Glass',
        category: 'object',
        keywords: ['reflections'],
        notes: 'Liquid surface',
      });

      expect(signA.status).toBe('confirmed');

      // Merge signB into signA
      const merged = await dreamSignService.mergeSigns(signB.id, signA.id);
      expect(merged.keywords).toContain('mirror');
      expect(merged.keywords).toContain('glass');
      expect(merged.keywords).toContain('looking glass');
      expect(merged.keywords).toContain('reflections');

      // Check signB is deleted
      const allSigns = await dreamSignService.getAllSigns();
      expect(allSigns.find((s) => s.id === signB.id)).toBeUndefined();
    });
  });

  describe('False Awakening Tracking', () => {
    it('persists and isolates false awakening incidents with triggers and lucidity conversion', async () => {
      const regularDream: DreamDraft = {
        title: 'Walking through a forest',
        narrative: 'Normal path through pine trees.',
        date: '2026-10-11',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        falseAwakening: false,
      };

      const faDream: DreamDraft = {
        title: 'Looping Morning Alarm',
        narrative: 'I opened my eyes in bed, went to the bathroom, looked at the mirror and my hands had 6 fingers.',
        date: '2026-10-12',
        vividness: 5,
        recallQuality: 'vivid',
        lucidity: 'lucid',
        falseAwakening: true,
        falseAwakeningDetails: {
          believedAwake: true,
          wakingEnvironment: 'Bedroom & Bathroom',
          lucidityTrigger: 'Looking at hands after noticing floating alarm clock',
          realityCheckPerformed: true,
          realityCheckNotes: 'Nose pinch check allowed breathing',
          scenesCount: 2,
        },
        scenesCount: 2,
        dreamControl: 4,
      };

      await dreamService.createDream(regularDream);
      const savedFa = await dreamService.createDream(faDream);

      const faList = await dreamService.getFalseAwakeningDreams();
      expect(faList.length).toBe(1);
      expect(faList[0].id).toBe(savedFa.id);
      expect(faList[0].falseAwakeningDetails?.believedAwake).toBe(true);
      expect(faList[0].falseAwakeningDetails?.wakingEnvironment).toBe('Bedroom & Bathroom');
      expect(faList[0].dreamControl).toBe(4);
    });
  });

  describe('Technique Lab & Sample Size Rigor', () => {
    it('always provides sample size (n) beside every comparison without fabricated causation', async () => {
      const log1: TechniqueDraft = {
        date: '2026-10-10',
        technique: 'MILD',
        secondaryTechniques: ['WBTB'],
        bedTime: '23:30',
        wakeTime: '07:15',
        confidenceRating: 4,
        outcome: 'lucid_dream',
        notes: 'Woke at 4:30 AM for 25m, visual rehearsal worked.',
      };

      const log2: TechniqueDraft = {
        date: '2026-10-11',
        technique: 'MILD',
        bedTime: '23:45',
        wakeTime: '07:30',
        confidenceRating: 3,
        outcome: 'dream_recalled',
      };

      const log3: TechniqueDraft = {
        date: '2026-10-12',
        technique: 'SSILD',
        confidenceRating: 5,
        outcome: 'no_recall',
      };

      await techniqueService.createLog(log1);
      await techniqueService.createLog(log2);
      await techniqueService.createLog(log3);

      const stats = await techniqueService.getTechniqueStats();

      expect(stats.totalAttempts).toBe(3);
      expect(stats.lucidCount).toBe(1);
      expect(stats.recalledCount).toBe(1);
      expect(stats.noRecallCount).toBe(1);

      // Verify MILD comparison
      const mildComp = stats.comparisons.find((c) => c.technique === 'MILD');
      expect(mildComp).toBeDefined();
      expect(mildComp?.sampleSize).toBe(2); // Explicit n = 2
      expect(mildComp?.lucidRate).toBe(50); // 1 of 2
      expect(mildComp?.recallRate).toBe(100); // 2 of 2
      expect(mildComp?.averageConfidence).toBe(3.5); // (4 + 3) / 2

      // Verify SSILD comparison
      const ssildComp = stats.comparisons.find((c) => c.technique === 'SSILD');
      expect(ssildComp).toBeDefined();
      expect(ssildComp?.sampleSize).toBe(1); // Explicit n = 1
      expect(ssildComp?.lucidRate).toBe(0);
      expect(ssildComp?.averageConfidence).toBe(5);
    });
  });

  describe('Analytics Intelligence & Heatmap Calculation', () => {
    it('accurately computes recall consistency without fabricating missing nights', async () => {
      // Add 2 dreams in the last 7 days
      await dreamService.createDream({
        title: 'Dream A',
        narrative: 'Narrative A',
        date: '2026-10-14',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Wonder', 'Joy'],
        tags: ['Flying'],
      });

      await dreamService.createDream({
        title: 'Dream B',
        narrative: 'Narrative B',
        date: '2026-10-13',
        vividness: 2,
        recallQuality: 'fragment',
        lucidity: 'non-lucid',
        emotions: ['Joy'],
        tags: ['Flying', 'City'],
      });

      const analytics7d = await analyticsService.getAnalytics('7d');

      expect(analytics7d.totalDreams).toBe(2);
      expect(analytics7d.totalLucid).toBe(1);
      expect(analytics7d.recordedDaysCount).toBe(2);
      // In 7 days, 2 recorded days => 2/7 = 29%
      expect(analytics7d.recallRate).toBe(29);
      expect(analytics7d.averageVividness).toBe(3); // (4 + 2) / 2

      // Emotion distribution check
      const joyEmotion = analytics7d.emotions.find((e) => e.emotion === 'Joy');
      expect(joyEmotion?.count).toBe(2);

      // Heatmap check: covers 90 days
      expect(analytics7d.heatmap.length).toBe(90);
    });
  });

  describe('Timeline Grouping', () => {
    it('groups dreams and technique logs of the same night chronologically', async () => {
      await dreamService.createDream({
        title: 'Morning flight',
        narrative: 'Soaring over mountains',
        date: '2026-10-14',
        wakeUpTime: '07:30',
        vividness: 4,
        recallQuality: 'vivid',
        lucidity: 'lucid',
      });

      await techniqueService.createLog({
        date: '2026-10-14',
        technique: 'WBTB',
        bedTime: '23:30',
        wakeTime: '07:00',
        outcome: 'lucid_dream',
      });

      const timeline = await dreamService.getTimelineEvents();
      expect(timeline.length).toBeGreaterThanOrEqual(1);

      const nightOf14 = timeline.find((n) => n.date === '2026-10-14');
      expect(nightOf14).toBeDefined();
      expect(nightOf14?.dreams.length).toBe(1);
      expect(nightOf14?.techniques.length).toBe(1);
      expect(nightOf14?.hasLucid).toBe(true);
    });
  });
});

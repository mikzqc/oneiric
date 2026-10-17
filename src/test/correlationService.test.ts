import { describe, it, expect, beforeEach } from 'vitest';
import { correlationService } from '../services/correlationService';
import { db } from '../db/database';
import { DreamEntry } from '../types/dream';
import { DreamSign } from '../types/dreamSign';
import { TechniqueLog } from '../types/technique';

describe('correlationService - Cross-Dream Correlation Engine', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.dreamSigns.clear();
    await db.techniqueLogs.clear();
  });

  it('handles empty database gracefully without NaN or errors', async () => {
    const report = await correlationService.computeCorrelations();
    expect(report.totalDreamsAnalyzed).toBe(0);
    expect(report.totalLucidDreams).toBe(0);
    expect(report.baselineLucidityRate).toBe(0);
    expect(report.baselineFARate).toBe(0);
    expect(report.averageVividness).toBe(0);
    expect(report.signLucidityCorrelations).toEqual([]);
    expect(report.signVividnessCorrelations).toEqual([]);
    expect(report.emotionLucidityCorrelations).toEqual([]);
    expect(report.faSignCorrelations).toEqual([]);
    expect(report.sceneComplexity.totalAnalyzedDreams).toBe(0);
    expect(report.techniqueOutcomes).toEqual([]);
  });

  it('counts repeated keywords in a single dream as ONE occurrence', async () => {
    // Dream repeating "flying" multiple times in title and narrative
    const dream1: DreamEntry = {
      id: 'd1',
      title: 'Flying high into the sky',
      narrative: 'I was flying and flying over a flying city with flying cars.',
      date: '2026-10-10',
      lucidity: 'lucid',
      vividness: 5,
      recallQuality: 'detailed',
      emotions: ['Wonder'],
      tags: ['flying'],
      createdAt: 1000,
      updatedAt: 1000,
    };
    await db.dreams.add(dream1);

    const sign: DreamSign = {
      id: 's-flight',
      name: 'Flying',
      category: 'anomaly',
      keywords: ['flying', 'flight'],
      status: 'confirmed',
      linkedDreamIds: [],
      distinctDreamCount: 1,
      createdAt: 1000,
      updatedAt: 1000,
    };
    await db.dreamSigns.add(sign);

    // With minOccurrences = 1 to test counting
    const report = await correlationService.computeCorrelations({
      timeRange: 'all',
      lucidityFilter: 'all',
      signStatus: 'all_active',
      minOccurrences: 1,
    });

    const flightCorr = report.signLucidityCorrelations.find((s) => s.signId === 's-flight');
    expect(flightCorr).toBeDefined();
    expect(flightCorr?.totalOccurrences).toBe(1); // strictly 1, not 4
    expect(flightCorr?.lucidOccurrences).toBe(1);
    expect(flightCorr?.signLucidityRate).toBe(100);
  });

  it('calculates sign lucidity rates and differences accurately across multiple distinct dreams', async () => {
    // 4 dreams: 2 lucid, 2 non-lucid (baseline = 50%)
    // Sign "ocean" appears in 2 dreams: 2 are lucid (sign rate = 100%, diff = +50%)
    const dreams: DreamEntry[] = [
      {
        id: 'd1',
        title: 'Bioluminescent Shore',
        narrative: 'Walking by the deep ocean with glowing waves.',
        date: '2026-10-01',
        lucidity: 'lucid',
        vividness: 4,
        recallQuality: 'detailed',
        emotions: ['Serenity'],
        tags: [],
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'd2',
        title: 'Deep Ocean Trench',
        narrative: 'Breathing peacefully under the ocean water.',
        date: '2026-10-02',
        lucidity: 'lucid',
        vividness: 5,
        recallQuality: 'crystal',
        emotions: ['Wonder'],
        tags: [],
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: 'd3',
        title: 'Office cubicle',
        narrative: 'Typing on a spreadsheet in a windowless room.',
        date: '2026-10-03',
        lucidity: 'non-lucid',
        vividness: 2,
        recallQuality: 'fragmentary',
        emotions: ['Boredom'],
        tags: [],
        createdAt: 3000,
        updatedAt: 3000,
      },
      {
        id: 'd4',
        title: 'Subway station',
        narrative: 'Waiting for a delayed train in the subway.',
        date: '2026-10-04',
        lucidity: 'non-lucid',
        vividness: 3,
        recallQuality: 'hazy',
        emotions: ['Anxiety'],
        tags: [],
        createdAt: 4000,
        updatedAt: 4000,
      },
    ];
    await db.dreams.bulkAdd(dreams);

    const sign: DreamSign = {
      id: 's-ocean',
      name: 'Ocean Water',
      category: 'location',
      keywords: ['ocean', 'sea'],
      status: 'confirmed',
      linkedDreamIds: [],
      distinctDreamCount: 2,
      createdAt: 1000,
      updatedAt: 1000,
    };
    await db.dreamSigns.add(sign);

    const report = await correlationService.computeCorrelations({
      timeRange: 'all',
      lucidityFilter: 'all',
      signStatus: 'all_active',
      minOccurrences: 2,
    });

    expect(report.totalDreamsAnalyzed).toBe(4);
    expect(report.baselineLucidityRate).toBe(50);

    const oceanCorr = report.signLucidityCorrelations.find((s) => s.signId === 's-ocean');
    expect(oceanCorr).toBeDefined();
    expect(oceanCorr?.totalOccurrences).toBe(2);
    expect(oceanCorr?.lucidOccurrences).toBe(2);
    expect(oceanCorr?.signLucidityRate).toBe(100);
    expect(oceanCorr?.rateDifference).toBe(50); // 100% - 50% = +50%
  });

  it('ignores dismissed signs and respects confirmed_only filter', async () => {
    const dream: DreamEntry = {
      id: 'd1',
      title: 'Mirror reflection',
      narrative: 'I saw a silver mirror reflection and an old clock.',
      date: '2026-10-10',
      lucidity: 'lucid',
      vividness: 4,
      recallQuality: 'detailed',
      emotions: [],
      tags: [],
      createdAt: 1000,
      updatedAt: 1000,
    };
    await db.dreams.add(dream);

    // Dismissed sign
    await db.dreamSigns.add({
      id: 's-dismissed',
      name: 'Mirror',
      category: 'object',
      keywords: ['mirror'],
      status: 'dismissed',
      linkedDreamIds: [],
      distinctDreamCount: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // Suggested sign
    await db.dreamSigns.add({
      id: 's-suggested',
      name: 'Clock',
      category: 'object',
      keywords: ['clock'],
      status: 'suggested',
      linkedDreamIds: [],
      distinctDreamCount: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });

    // 1. With all_active (should ignore dismissed, include suggested)
    const reportActive = await correlationService.computeCorrelations({
      timeRange: 'all',
      lucidityFilter: 'all',
      signStatus: 'all_active',
      minOccurrences: 1,
    });
    expect(reportActive.signLucidityCorrelations.some((s) => s.signId === 's-dismissed')).toBe(false);
    expect(reportActive.signLucidityCorrelations.some((s) => s.signId === 's-suggested')).toBe(true);

    // 2. With confirmed_only (should exclude suggested too)
    const reportConfirmedOnly = await correlationService.computeCorrelations({
      timeRange: 'all',
      lucidityFilter: 'all',
      signStatus: 'confirmed_only',
      minOccurrences: 1,
    });
    expect(reportConfirmedOnly.signLucidityCorrelations.some((s) => s.signId === 's-suggested')).toBe(false);
  });

  it('distinguishes missing data from 0 in dreamControl and vividness', async () => {
    const dreams: DreamEntry[] = [
      {
        id: 'd1',
        title: 'Single Scene Unrated Control',
        narrative: 'Simple dream with no control rating.',
        date: '2026-10-01',
        lucidity: 'lucid',
        vividness: 4,
        recallQuality: 'detailed',
        scenesCount: 1,
        // dreamControl is undefined (NOT 0!)
        emotions: [],
        tags: [],
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'd2',
        title: 'Multi Scene High Control',
        narrative: 'Complex shifting dream scenes with high agency.',
        date: '2026-10-02',
        lucidity: 'lucid',
        vividness: 5,
        recallQuality: 'crystal',
        scenesCount: 3,
        dreamControl: 5, // Valid control
        emotions: [],
        tags: [],
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];
    await db.dreams.bulkAdd(dreams);

    const report = await correlationService.computeCorrelations();
    expect(report.sceneComplexity.singleSceneCount).toBe(1);
    expect(report.sceneComplexity.multiSceneCount).toBe(1);
    // Single scene control was undefined, so singleSceneAvgControl should be null (not 0!)
    expect(report.sceneComplexity.singleSceneAvgControl).toBeNull();
    // Multi scene control was 5
    expect(report.sceneComplexity.multiSceneAvgControl).toBe(5);
  });

  it('analyzes false awakening co-occurrences accurately', async () => {
    const dreams: DreamEntry[] = [
      {
        id: 'd1',
        title: 'Bedroom Loop 1',
        narrative: 'Woke up in my bedroom and checked the digital alarm clock.',
        date: '2026-10-05',
        lucidity: 'non-lucid',
        vividness: 4,
        recallQuality: 'detailed',
        falseAwakening: true,
        emotions: [],
        tags: [],
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'd2',
        title: 'Bedroom Loop 2',
        narrative: 'Woke up again in my bedroom looking at the clock.',
        date: '2026-10-05',
        lucidity: 'uncertain',
        vividness: 4,
        recallQuality: 'detailed',
        falseAwakening: true,
        emotions: [],
        tags: [],
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: 'd3',
        title: 'Garden walk',
        narrative: 'Walking outside in a sunny botanical garden.',
        date: '2026-10-06',
        lucidity: 'non-lucid',
        vividness: 3,
        recallQuality: 'detailed',
        falseAwakening: false,
        emotions: [],
        tags: [],
        createdAt: 3000,
        updatedAt: 3000,
      },
    ];
    await db.dreams.bulkAdd(dreams);

    const sign: DreamSign = {
      id: 's-clock',
      name: 'Alarm Clock',
      category: 'object',
      keywords: ['clock', 'alarm clock'],
      status: 'confirmed',
      linkedDreamIds: [],
      distinctDreamCount: 2,
      createdAt: 1000,
      updatedAt: 1000,
    };
    await db.dreamSigns.add(sign);

    const report = await correlationService.computeCorrelations({
      timeRange: 'all',
      lucidityFilter: 'all',
      signStatus: 'all_active',
      minOccurrences: 2,
    });

    expect(report.totalFalseAwakenings).toBe(2);
    // Baseline FA rate: 2 out of 3 = 66.7%
    expect(report.baselineFARate).toBe(66.7);

    const faCorr = report.faSignCorrelations.find((s) => s.signId === 's-clock');
    expect(faCorr).toBeDefined();
    expect(faCorr?.signOccurrencesInFA).toBe(2);
    expect(faCorr?.faRateWithSign).toBe(100); // 2/2 = 100%
  });

  it('computes induction technique recall and lucidity rates with sample size n', async () => {
    const logs: TechniqueLog[] = [
      {
        id: 't1',
        date: '2026-10-01',
        technique: 'SSILD',
        outcome: 'lucid_dream',
        confidenceRating: 4,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 't2',
        date: '2026-10-02',
        technique: 'SSILD',
        outcome: 'dream_recalled',
        confidenceRating: 3,
        createdAt: 2000,
        updatedAt: 2000,
      },
      {
        id: 't3',
        date: '2026-10-03',
        technique: 'SSILD',
        outcome: 'no_recall',
        confidenceRating: 2,
        createdAt: 3000,
        updatedAt: 3000,
      },
      {
        id: 't4',
        date: '2026-10-04',
        technique: 'WBTB',
        outcome: 'no_recall',
        createdAt: 4000,
        updatedAt: 4000,
      },
    ];
    await db.techniqueLogs.bulkAdd(logs);

    const report = await correlationService.computeCorrelations();
    const ssild = report.techniqueOutcomes.find((t) => t.technique === 'SSILD');
    expect(ssild).toBeDefined();
    expect(ssild?.sampleSize).toBe(3);
    expect(ssild?.recallCount).toBe(2); // 2 out of 3 recalled (66.7%)
    expect(ssild?.recallRate).toBe(66.7);
    expect(ssild?.lucidCount).toBe(1); // 1 out of 3 lucid (33.3%)
    expect(ssild?.lucidRate).toBe(33.3);
    expect(ssild?.avgConfidence).toBe(3); // (4+3+2)/3
    expect(ssild?.hasSufficientData).toBe(true); // n >= 3

    const wbtb = report.techniqueOutcomes.find((t) => t.technique === 'WBTB');
    expect(wbtb?.sampleSize).toBe(1);
    expect(wbtb?.hasSufficientData).toBe(false); // n < 3
  });

  it('is deterministic: identical database state produces identical correlation report', async () => {
    const dream: DreamEntry = {
      id: 'd1',
      title: 'Aurora Borealis',
      narrative: 'Watching green celestial aurora over a quiet lake.',
      date: '2026-10-10',
      lucidity: 'lucid',
      vividness: 5,
      recallQuality: 'crystal',
      emotions: ['Awe', 'Wonder'],
      tags: ['celestial'],
      createdAt: 1000,
      updatedAt: 1000,
    };
    await db.dreams.add(dream);

    const report1 = await correlationService.computeCorrelations();
    const report2 = await correlationService.computeCorrelations();
    expect(report1).toEqual(report2);
  });
});

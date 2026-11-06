import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { dreamService } from '../services/dreamService';
import { searchDreams } from '../services/searchService';
import {
  DreamDraft,
  INDUCTION_TECHNIQUE_OPTIONS,
  formatTechniqueDisplayName,
  formatTechniqueShortName,
} from '../types/dream';

describe('Dream Induction Technique Logging System', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    localStorage.clear();
  });

  describe('Technique Options & Helpers', () => {
    it('defines all required core induction techniques', () => {
      const values = INDUCTION_TECHNIQUE_OPTIONS.map((opt) => opt.value);
      expect(values).toContain('none');
      expect(values).toContain('MILD');
      expect(values).toContain('WILD');
      expect(values).toContain('SSILD');
      expect(values).toContain('WBTB');
      expect(values).toContain('ADA');
      expect(values).toContain('Reality Checks');
      expect(values).toContain('FILD');
      expect(values).toContain('DEILD');
      expect(values).toContain('CANWILD');
      expect(values).toContain('SATS');
      expect(values).toContain('Other');
    });

    it('formats display names correctly for predefined and custom techniques', () => {
      expect(formatTechniqueDisplayName('none')).toBe('None (Natural)');
      expect(formatTechniqueDisplayName(undefined)).toBe('None (Natural)');
      expect(formatTechniqueDisplayName('MILD')).toBe('MILD (Mnemonic Induction)');
      expect(formatTechniqueDisplayName('WILD')).toBe('WILD (Wake-Initiated)');
      expect(formatTechniqueDisplayName('SSILD')).toBe('SSILD (Senses Initiated)');
      expect(formatTechniqueDisplayName('ADA')).toBe('ADA (All Day Awareness)');
      expect(formatTechniqueDisplayName('Reality Checks')).toBe('Questioning Reality / Reality Checks');
      expect(formatTechniqueDisplayName('Other', 'Dream Yoga')).toBe('Dream Yoga');
      expect(formatTechniqueDisplayName('Other', '')).toBe('Other (Custom)');
    });

    it('formats short labels correctly for badge and card display', () => {
      expect(formatTechniqueShortName('none')).toBe('None');
      expect(formatTechniqueShortName('MILD')).toBe('MILD');
      expect(formatTechniqueShortName('WILD')).toBe('WILD');
      expect(formatTechniqueShortName('SSILD')).toBe('SSILD');
      expect(formatTechniqueShortName('Other', 'Galantamine')).toBe('Galantamine');
    });
  });

  describe('Persistence with Dream Service', () => {
    it('saves a dream with predefined technique (MILD) and lucidity outcome', async () => {
      const draft: DreamDraft = {
        title: 'Mnemonic Lake Flight',
        narrative: 'I repeated my MILD affirmation and suddenly realized I was floating over crystal water.',
        date: '2026-11-06',
        vividness: 4,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Awe', 'Euphoria'],
        tags: ['Flying'],
        techniqueUsed: 'MILD',
      };

      const created = await dreamService.createDream(draft);
      expect(created.id).toBeDefined();
      expect(created.techniqueUsed).toBe('MILD');

      const retrieved = await dreamService.getDreamById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.techniqueUsed).toBe('MILD');
      expect(retrieved?.lucidity).toBe('lucid');
    });

    it('saves a dream with custom technique (Other) and custom name', async () => {
      const draft: DreamDraft = {
        title: 'Dream Yoga Temple Experience',
        narrative: 'Practiced Tibetan Dream Yoga throat chakra visualization before falling asleep.',
        date: '2026-11-06',
        vividness: 5,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Serenity'],
        tags: ['Astral'],
        techniqueUsed: 'Other',
        customTechniqueUsed: 'Tibetan Dream Yoga',
      };

      const created = await dreamService.createDream(draft);
      expect(created.techniqueUsed).toBe('Other');
      expect(created.customTechniqueUsed).toBe('Tibetan Dream Yoga');

      const retrieved = await dreamService.getDreamById(created.id);
      expect(retrieved?.techniqueUsed).toBe('Other');
      expect(retrieved?.customTechniqueUsed).toBe('Tibetan Dream Yoga');
    });

    it('updates dream induction technique when modified during editing', async () => {
      const draft: DreamDraft = {
        title: 'Morning Forest Walk',
        narrative: 'Walking through misty redwoods.',
        date: '2026-11-06',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Peace'],
        tags: ['Nature'],
      };

      const created = await dreamService.createDream(draft);
      expect(created.techniqueUsed).toBeUndefined();

      // Update with SSILD technique
      await dreamService.updateDream(created.id, {
        techniqueUsed: 'SSILD',
      });

      const updated = await dreamService.getDreamById(created.id);
      expect(updated?.techniqueUsed).toBe('SSILD');
    });
  });

  describe('Deep Content Search on Technique Fields', () => {
    it('indexes and matches dreams by technique name', async () => {
      const d1 = await dreamService.createDream({
        title: 'Observing the Stars',
        narrative: 'Gazing at constellations while lucid.',
        date: '2026-11-06',
        vividness: 4,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Wonder'],
        tags: ['Space'],
        techniqueUsed: 'WILD',
      });

      const d2 = await dreamService.createDream({
        title: 'Standard Grocery Shopping',
        narrative: 'Buying milk and eggs at a quiet store.',
        date: '2026-11-05',
        vividness: 2,
        recallQuality: 'hazy',
        lucidity: 'non-lucid',
        emotions: ['Curiosity'],
        tags: ['Routine'],
      });

      const results = searchDreams([d1, d2], 'WILD');
      expect(results.length).toBe(1);
      expect(results[0].dream.id).toBe(d1.id);
      expect(results[0].matchDetails.some((m) => m.field === 'technique')).toBe(true);
      expect(results[0].matchDetails.some((m) => m.label.includes('WILD'))).toBe(true);
    });

    it('indexes and matches dreams by custom technique name', async () => {
      const customDream = await dreamService.createDream({
        title: 'Binaural Drift',
        narrative: 'Listening to 4Hz theta isochronic tones.',
        date: '2026-11-06',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'uncertain',
        emotions: ['Calm'],
        tags: ['Audio'],
        techniqueUsed: 'Other',
        customTechniqueUsed: 'Binaural Theta Beats',
      });

      const results = searchDreams([customDream], 'binaural');
      expect(results.length).toBe(1);
      expect(results[0].matchDetails.some((m) => m.field === 'technique')).toBe(true);
      expect(results[0].matchDetails.some((m) => m.label.includes('Binaural Theta Beats'))).toBe(true);
    });
  });
});

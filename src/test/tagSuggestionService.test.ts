import { describe, it, expect } from 'vitest';
import { extractTagSuggestions, DREAM_TAG_RULES } from '../services/tagSuggestionService';

describe('tagSuggestionService', () => {
  it('contains an extensive collection of curated rules covering major dream themes', () => {
    expect(DREAM_TAG_RULES.length).toBeGreaterThanOrEqual(50);
    const flyingRule = DREAM_TAG_RULES.find((r) => r.tag === 'Flying');
    expect(flyingRule).toBeDefined();
    expect(flyingRule?.keywords).toContain('flying');
    expect(flyingRule?.keywords).toContain('levitate');
  });

  it('detects multiple relevant tags from dream narrative and scenes text', () => {
    const dreamText = `
      I was walking along the ocean waves when suddenly I realized I was dreaming.
      I began flying high above the water, looking at the stars in space.
      Later, I found myself in a high school classroom taking an exam unprepared.
    `;

    const { detectedSuggestions } = extractTagSuggestions(dreamText);
    const detectedTags = detectedSuggestions.map((s) => s.tag);

    expect(detectedTags).toContain('Ocean & Sea');
    expect(detectedTags).toContain('Lucid Dream');
    expect(detectedTags).toContain('Flying');
    expect(detectedTags).toContain('Space & Planets');
    expect(detectedTags).toContain('School & Classroom');
    expect(detectedTags).toContain('Exam & Test');
  });

  it('ranks tags with higher keyword occurrences higher', () => {
    const dreamText = `
      I was flying and flying. I flew over the city, soaring higher. The flight was effortless, hovering in the sky.
      There was a small dog barking below.
    `;

    const { detectedSuggestions } = extractTagSuggestions(dreamText);
    expect(detectedSuggestions.length).toBeGreaterThanOrEqual(2);
    expect(detectedSuggestions[0].tag).toBe('Flying');
    expect(detectedSuggestions[0].matchCount).toBeGreaterThan(3);
  });

  it('excludes tags that are already selected in existingTags', () => {
    const dreamText = 'I was flying across the ocean and realized I was in a lucid dream.';
    const { detectedSuggestions } = extractTagSuggestions(dreamText, {
      existingTags: ['Flying', 'Ocean & Sea'],
    });

    const detectedTags = detectedSuggestions.map((s) => s.tag);
    expect(detectedTags).not.toContain('Flying');
    expect(detectedTags).not.toContain('Ocean & Sea');
    expect(detectedTags).toContain('Lucid Dream');
  });

  it('detects and suggests user custom tags when they appear in the dream text', () => {
    const dreamText = 'I visited Neo-Tokyo and bought a vintage guitar at a cyberpunk market.';
    const { detectedSuggestions } = extractTagSuggestions(dreamText, {
      userDistinctTags: ['Neo-Tokyo', 'Guitar', 'Cyberpunk', 'Astronomy'],
    });

    const detectedTags = detectedSuggestions.map((s) => s.tag);
    expect(detectedTags).toContain('Neo-Tokyo');
    expect(detectedTags).toContain('Guitar');
    expect(detectedTags).toContain('Cyberpunk');
    expect(detectedTags).not.toContain('Astronomy');
  });

  it('avoids false substring matches (e.g. butterfly should not trigger Flying)', () => {
    const dreamText = 'I watched a colorful butterfly land on a flower in the garden.';
    const { detectedSuggestions } = extractTagSuggestions(dreamText);
    const detectedTags = detectedSuggestions.map((s) => s.tag);

    expect(detectedTags).not.toContain('Flying');
  });

  it('correctly handles multi-word phrases and common lucid dreaming tropes', () => {
    const dreamText = `
      I experienced sleep paralysis and saw a shadowy figure standing by my door.
      Then I had a false awakening and thought I woke up in my bed.
      Suddenly my teeth were loose and falling out into my hands.
    `;

    const { detectedSuggestions } = extractTagSuggestions(dreamText);
    const detectedTags = detectedSuggestions.map((s) => s.tag);

    expect(detectedTags).toContain('Sleep Paralysis');
    expect(detectedTags).toContain('Shadow Figure');
    expect(detectedTags).toContain('False Awakening');
    expect(detectedTags).toContain('Teeth Falling Out');
  });

  it('provides general suggestions when text is empty or has no matches', () => {
    const { detectedSuggestions, generalSuggestions } = extractTagSuggestions('', {
      userDistinctTags: ['MySpecialTag', 'RecurringMotif'],
      limit: 10,
    });

    expect(detectedSuggestions).toHaveLength(0);
    expect(generalSuggestions).toContain('MySpecialTag');
    expect(generalSuggestions).toContain('RecurringMotif');
    expect(generalSuggestions.length).toBe(10);
  });
});

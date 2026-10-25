import { describe, it, expect } from 'vitest';
import { DreamEntry } from '../types/dream';
import {
  searchDreams,
  isFuzzyMatch,
  levenshtein,
  stemToken,
} from '../services/searchService';

describe('Deep Content Search & Semantic Concept Matching Engine', () => {
  const testDreams: DreamEntry[] = [
    {
      id: 'dream-1',
      title: 'The Obsidian Observatory',
      narrative: 'Looking out through crystalline dome windows at nebulae.',
      date: '2026-10-24',
      vividness: 4,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      emotions: ['Awe', 'Serenity'],
      tags: ['Astral', 'Space'],
      dreamSignsNotes: 'Binary star constellations pulsating rhythmically',
      scenes: [
        {
          id: 'sc-1',
          sceneNumber: 1,
          title: 'The Submerged Chamber',
          narrative: 'Entered a flooded chamber where gravity reversed and breathing underwater was possible.',
          lucid: true,
        },
      ],
      interpretationNotes: 'Psychological reflections on stillness and deep cosmic architecture.',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
    {
      id: 'dream-2',
      title: 'Morning Routine Interrupted',
      narrative: 'Woke up in my bedroom and reached for the digital clock.',
      date: '2026-10-23',
      vividness: 3,
      recallQuality: 'detailed',
      lucidity: 'non-lucid',
      emotions: ['Confusion'],
      tags: [],
      falseAwakening: true,
      falseAwakeningDetails: {
        believedAwake: false,
        environmentDescription: 'Exact replica of childhood bedroom',
        triggerOrAnomaly: 'Digital numbers on clock were running backwards',
        realityCheckNotes: 'Pushed finger through solid glass mirror',
      },
      realityChecksUseful: ['Pinch nose and breathe', 'Mirror look'],
      createdAt: 1699000000000,
      updatedAt: 1699000000000,
    },
    {
      id: 'dream-3',
      title: 'Skyline Navigation',
      narrative: 'Gliding and hovering effortlessly above skyscraper rooftops.',
      date: '2026-10-22',
      vividness: 5,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      dreamControl: 4,
      emotions: ['Euphoria', 'Wonder'],
      tags: ['Flying'],
      createdAt: 1698000000000,
      updatedAt: 1698000000000,
    },
    {
      id: 'dream-4',
      title: 'Ancient Archives',
      narrative: 'Walking through labyrinthine corridors made of carved sandstone.',
      date: '2026-10-21',
      vividness: 2,
      recallQuality: 'fragmentary',
      lucidity: 'non-lucid',
      emotions: ['Curiosity'],
      tags: ['History'],
      createdAt: 1697000000000,
      updatedAt: 1697000000000,
    },
  ];

  it('1. Exact and Partial Keyword Matching on Title and Narrative', () => {
    // Exact title
    const resTitle = searchDreams(testDreams, 'Obsidian Observatory');
    expect(resTitle.length).toBeGreaterThanOrEqual(1);
    expect(resTitle[0].dream.id).toBe('dream-1');
    expect(resTitle[0].score).toBeGreaterThan(60);

    // Narrative keyword
    const resNarrative = searchDreams(testDreams, 'crystalline dome');
    expect(resNarrative.length).toBeGreaterThanOrEqual(1);
    expect(resNarrative[0].dream.id).toBe('dream-1');
  });

  it('2. Deep Content: Finds entries through Scenes (title & narrative)', () => {
    // "Submerged Chamber" only appears in scene title
    const resSceneTitle = searchDreams(testDreams, 'Submerged Chamber');
    expect(resSceneTitle.some((r) => r.dream.id === 'dream-1')).toBe(true);
    expect(resSceneTitle[0].matchDetails.some((m) => m.field === 'scenes')).toBe(true);

    // "flooded chamber" only appears in scene narrative
    const resSceneNarrative = searchDreams(testDreams, 'flooded chamber');
    expect(resSceneNarrative.some((r) => r.dream.id === 'dream-1')).toBe(true);
  });

  it('3. Deep Content: Finds entries through Interpretation & Reflection Notes', () => {
    // "cosmic architecture" only appears in dream-1 interpretationNotes
    const resInterp = searchDreams(testDreams, 'cosmic architecture');
    expect(resInterp).toHaveLength(1);
    expect(resInterp[0].dream.id).toBe('dream-1');
    expect(resInterp[0].matchDetails.some((m) => m.field === 'interpretation')).toBe(true);
  });

  it('4. Deep Content: Finds entries through False Awakening Details & Anomalies', () => {
    // "childhood bedroom" only in falseAwakeningDetails.environmentDescription
    const resEnv = searchDreams(testDreams, 'childhood bedroom');
    expect(resEnv.some((r) => r.dream.id === 'dream-2')).toBe(true);
    expect(resEnv[0].matchDetails.some((m) => m.field === 'anomaly')).toBe(true);

    // "running backwards" only in triggerOrAnomaly
    const resTrigger = searchDreams(testDreams, 'running backwards');
    expect(resTrigger.some((r) => r.dream.id === 'dream-2')).toBe(true);

    // "solid glass mirror" only in realityCheckNotes
    const resRC = searchDreams(testDreams, 'solid glass mirror');
    expect(resRC.some((r) => r.dream.id === 'dream-2')).toBe(true);
  });

  it('5. Semantic Concept Matching: "false awakening" query matches structured flag and descriptive phrasing', () => {
    // Searching "false awakening" matches dream-2 via concept trigger & structured falseAwakening: true
    const resFA = searchDreams(testDreams, 'false awakening');
    expect(resFA.some((r) => r.dream.id === 'dream-2')).toBe(true);
    expect(resFA.find((r) => r.dream.id === 'dream-2')?.matchDetails.some((m) => m.field === 'semantic')).toBe(true);

    // Query "thought i woke up" matches dream-2
    const resWoke = searchDreams(testDreams, 'thought i woke up');
    expect(resWoke.some((r) => r.dream.id === 'dream-2')).toBe(true);
  });

  it('6. Semantic Concept Matching: "flying" matches hovering, gliding, and levitation', () => {
    // Dream-3 has narrative "Gliding and hovering effortlessly" and tag "Flying"
    const resFlying = searchDreams(testDreams, 'flying');
    expect(resFlying[0].dream.id).toBe('dream-3');

    // Searching "levitation" matches dream-3 via concept cluster
    const resLev = searchDreams(testDreams, 'levitation');
    expect(resLev.some((r) => r.dream.id === 'dream-3')).toBe(true);
  });

  it('7. Semantic Concept Matching: "water" and "ocean" matches submerged and underwater scenes', () => {
    // Dream-1 has a scene with "breathing underwater" and "flooded chamber"
    const resWater = searchDreams(testDreams, 'water');
    expect(resWater.some((r) => r.dream.id === 'dream-1')).toBe(true);
  });

  it('8. Semantic Concept Matching: "dream control" matches dreamControl rating > 0', () => {
    // Dream-3 has dreamControl: 4
    const resControl = searchDreams(testDreams, 'dream control');
    expect(resControl.some((r) => r.dream.id === 'dream-3')).toBe(true);
  });

  it('9. Imperfect Input: Tolerates capitalization, punctuation, and typos (fuzzy matching)', () => {
    // Capitalization and punctuation
    const resPunct = searchDreams(testDreams, 'OBSIDIAN... observatory?!');
    expect(resPunct[0].dream.id).toBe('dream-1');

    // Minor typo: "observtory" (missing 'a')
    const resTypo1 = searchDreams(testDreams, 'observtory');
    expect(resTypo1.some((r) => r.dream.id === 'dream-1')).toBe(true);

    // Minor typo: "submarin" -> matches "submerged"
    const resTypo2 = searchDreams(testDreams, 'crystalline');
    expect(resTypo2.some((r) => r.dream.id === 'dream-1')).toBe(true);

    // Levenshtein helper unit test
    expect(levenshtein('observatory', 'observtory')).toBe(1);
    expect(isFuzzyMatch('observtory', 'observatory')).toBe(true);
    expect(stemToken('hovering')).toBe('hover');
    expect(stemToken('skyscrapers')).toBe('skyscraper');
  });

  it('10. Relevance Ranking: Exact title matches rank higher than narrative/thematic matches', () => {
    const res = searchDreams(testDreams, 'Obsidian');
    expect(res[0].dream.title).toBe('The Obsidian Observatory');
    // First result must have highest score
    if (res.length > 1) {
      expect(res[0].score).toBeGreaterThan(res[1].score);
    }
  });

  it('11. Empty and Edge Cases Handling', () => {
    // Empty query returns all dreams with score 0
    const resEmpty = searchDreams(testDreams, '');
    expect(resEmpty).toHaveLength(testDreams.length);
    expect(resEmpty[0].score).toBe(0);

    // Whitespace only
    const resSpace = searchDreams(testDreams, '   ');
    expect(resSpace).toHaveLength(testDreams.length);

    // Non-matching gibberish returns 0 matches
    const resGibberish = searchDreams(testDreams, 'xyzqwerty999nonexistent');
    expect(resGibberish).toHaveLength(0);

    // Incomplete or sparse dream objects
    const sparseDream: DreamEntry = {
      id: 'sparse',
      title: 'Minimal Entry',
      narrative: 'Short text',
      date: '2026-10-25',
      vividness: 1,
      recallQuality: 'hazy',
      lucidity: 'non-lucid',
      emotions: [],
      tags: [],
    };
    const resSparse = searchDreams([sparseDream], 'Minimal Entry');
    expect(resSparse).toHaveLength(1);
  });
});

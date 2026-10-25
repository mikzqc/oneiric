import { DreamEntry } from '../types/dream';

export interface SearchMatchDetail {
  field:
    | 'title'
    | 'narrative'
    | 'tags'
    | 'emotions'
    | 'signs'
    | 'scenes'
    | 'interpretation'
    | 'anomaly'
    | 'semantic';
  label: string;
  matchedSnippet?: string;
}

export interface DreamSearchResult {
  dream: DreamEntry;
  score: number;
  matchDetails: SearchMatchDetail[];
}

/**
 * Normalizes text for case-insensitive, punctuation-agnostic search
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s]/g, ' ') // replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple English stemmer/stripper for common suffixes (plurals, -ing, -ed)
 */
export function stemToken(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 5) {
    const base = word.slice(0, -3);
    // double consonant rule: running -> run
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      return base.slice(0, -1);
    }
    return base;
  }
  if (word.endsWith('ed') && word.length > 4) {
    const base = word.slice(0, -2);
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      return base.slice(0, -1);
    }
    return base;
  }
  return word;
}

/**
 * Fast Levenshtein distance for fuzzy typo tolerance
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Shortcut for large length differences
  if (Math.abs(a.length - b.length) > 2) return Math.abs(a.length - b.length);

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Determines if a query token fuzzy-matches a target word with acceptable edit distance
 */
export function isFuzzyMatch(queryToken: string, targetToken: string): boolean {
  if (queryToken === targetToken) return true;
  if (targetToken.startsWith(queryToken) && queryToken.length >= 3) return true;

  const stemQ = stemToken(queryToken);
  const stemT = stemToken(targetToken);
  if (stemQ === stemT) return true;

  const len = Math.max(stemQ.length, stemT.length);
  if (len < 4) return false;

  const maxDist = len <= 6 ? 1 : 2;
  return levenshtein(stemQ, stemT) <= maxDist;
}

/**
 * Curated local semantic concept clusters for dream journaling
 */
interface SemanticConcept {
  id: string;
  name: string;
  triggers: string[]; // queries that activate this concept
  relatedKeywords: string[]; // words in dream that fulfill this concept
  flagCheck?: (dream: DreamEntry) => boolean; // structured flag check
}

const SEMANTIC_CONCEPTS: SemanticConcept[] = [
  {
    id: 'false-awakening',
    name: 'False Awakening',
    triggers: [
      'false awakening',
      'false awakenings',
      'fa',
      'waking up in dream',
      'woke up in dream',
      'woke up in bed',
      'thought i was awake',
      'thought i woke up',
      'dream within a dream',
      'sleep paralysis',
      'looping awakenings',
      'nested dream',
    ],
    relatedKeywords: [
      'false awakening',
      'woke up in my bedroom',
      'thought i was awake',
      'believed i was awake',
      'alarm went off',
      'got out of bed',
      'bedroom rearranged',
      'mirrored bedroom',
      'sleep paralysis',
      'looping dream',
      'apparent waking',
    ],
    flagCheck: (dream) => Boolean(dream.falseAwakening),
  },
  {
    id: 'lucidity',
    name: 'Lucid Awareness',
    triggers: [
      'lucid',
      'lucidity',
      'lucid dream',
      'conscious',
      'consciousness',
      'aware of dreaming',
      'dream awareness',
      'reality check',
      'finger through palm',
      'nose pinch',
    ],
    relatedKeywords: [
      'lucid',
      'lucidity',
      'i realized i was dreaming',
      'became aware',
      'reality check',
      'stabilize dream',
      'dream state confirmed',
    ],
    flagCheck: (dream) => dream.lucidity === 'lucid',
  },
  {
    id: 'dream-control',
    name: 'Dream Control & Manipulation',
    triggers: [
      'control',
      'dream control',
      'manipulation',
      'teleport',
      'teleportation',
      'telekinesis',
      'manifest',
      'manifesting',
      'conjure',
      'superpower',
      'flying at will',
    ],
    relatedKeywords: [
      'control',
      'manipulate',
      'changed the scene',
      'conjured',
      'teleported',
      'telekinetic',
      'controlled flight',
      'summoned',
    ],
    flagCheck: (dream) => typeof dream.dreamControl === 'number' && dream.dreamControl > 0,
  },
  {
    id: 'flying',
    name: 'Flight & Levitation',
    triggers: ['flying', 'fly', 'flight', 'levitate', 'levitation', 'hovering', 'soaring', 'gliding'],
    relatedKeywords: [
      'flying',
      'flight',
      'levitate',
      'levitating',
      'hovering',
      'soaring',
      'gliding',
      'airborne',
      'takeoff',
      'floating in air',
    ],
  },
  {
    id: 'water',
    name: 'Water & Oceans',
    triggers: [
      'water',
      'ocean',
      'sea',
      'marine',
      'aquatic',
      'river',
      'lake',
      'swimming',
      'submerged',
      'underwater',
      'diving',
      'drowning',
      'waves',
    ],
    relatedKeywords: [
      'ocean',
      'sea',
      'water',
      'underwater',
      'submerged',
      'diving',
      'swimming',
      'breathing underwater',
      'waves',
      'tsunami',
      'tide',
      'coast',
      'aquarium',
    ],
  },
  {
    id: 'nightmare',
    name: 'Nightmares & Fear',
    triggers: ['nightmare', 'nightmares', 'terror', 'horror', 'scary', 'fear', 'panic', 'chased'],
    relatedKeywords: [
      'nightmare',
      'terror',
      'panic',
      'horrified',
      'terrified',
      'screaming',
      'chased',
      'pursued',
      'monster',
      'demon',
      'creature',
      'hiding',
      'dread',
    ],
  },
  {
    id: 'space',
    name: 'Space & Cosmos',
    triggers: ['space', 'stars', 'cosmos', 'galaxy', 'astral', 'planet', 'universe', 'moon', 'orbit'],
    relatedKeywords: [
      'space',
      'stars',
      'galaxy',
      'cosmos',
      'nebula',
      'planet',
      'lunar',
      'astral',
      'orbit',
      'celestial',
      'constellation',
      'zero gravity',
    ],
  },
  {
    id: 'characters',
    name: 'Characters & People',
    triggers: ['character', 'characters', 'people', 'person', 'stranger', 'crowd', 'friend', 'family'],
    relatedKeywords: [
      'character',
      'stranger',
      'shadow figure',
      'friend',
      'mother',
      'father',
      'sister',
      'brother',
      'crowd',
      'gathering',
      'guide',
      'companion',
    ],
  },
  {
    id: 'anomaly',
    name: 'Anomalies & Strange Physics',
    triggers: ['anomaly', 'anomalies', 'impossible physics', 'distortion', 'glitch', 'strange clock', 'weird mirror'],
    relatedKeywords: [
      'anomaly',
      'impossible',
      'clock backward',
      'mirror distorted',
      'shifted',
      'shapeshifting',
      'glitch',
      'strange physics',
      'reversed gravity',
    ],
  },
];

/**
 * Searches and ranks dreams with deep field scanning, fuzzy matching, and semantic concept expansion.
 */
export function searchDreams(dreams: DreamEntry[], rawQuery: string): DreamSearchResult[] {
  const query = normalizeText(rawQuery);
  if (!query) {
    return dreams.map((dream) => ({
      dream,
      score: 0,
      matchDetails: [],
    }));
  }

  const queryTokens = query.split(' ').filter((t) => t.length > 0);
  if (queryTokens.length === 0) {
    return dreams.map((dream) => ({
      dream,
      score: 0,
      matchDetails: [],
    }));
  }

  // Find any active semantic concepts triggered by this query
  const matchedConcepts = SEMANTIC_CONCEPTS.filter((concept) => {
    return concept.triggers.some((trigger) => {
      const normTrigger = normalizeText(trigger);
      return query === normTrigger || query.includes(normTrigger) || normTrigger.includes(query);
    });
  });

  const results: DreamSearchResult[] = [];

  for (const dream of dreams) {
    let score = 0;
    const matchDetails: SearchMatchDetail[] = [];
    const matchedFieldsSet = new Set<string>();

    // 1. Direct Title Matching
    const normTitle = normalizeText(dream.title);
    if (normTitle) {
      if (normTitle === query) {
        score += 100;
        matchDetails.push({ field: 'title', label: 'Exact Title Match' });
        matchedFieldsSet.add('title');
      } else if (normTitle.includes(query)) {
        score += 65;
        matchDetails.push({ field: 'title', label: 'Title' });
        matchedFieldsSet.add('title');
      } else {
        const titleTokens = normTitle.split(' ');
        const matchesAll = queryTokens.every((qt) => titleTokens.some((tt) => isFuzzyMatch(qt, tt)));
        if (matchesAll) {
          score += 45;
          matchDetails.push({ field: 'title', label: 'Title' });
          matchedFieldsSet.add('title');
        } else {
          const matchCount = queryTokens.filter((qt) => titleTokens.some((tt) => isFuzzyMatch(qt, tt))).length;
          if (matchCount > 0) {
            score += matchCount * 15;
            matchDetails.push({ field: 'title', label: 'Title' });
            matchedFieldsSet.add('title');
          }
        }
      }
    }

    // 2. Tags Matching
    if (dream.tags && dream.tags.length > 0) {
      for (const tag of dream.tags) {
        const normTag = normalizeText(tag);
        if (normTag === query || queryTokens.some((qt) => normTag.includes(qt))) {
          score += 40;
          if (!matchedFieldsSet.has('tags')) {
            matchDetails.push({ field: 'tags', label: `Tag: #${tag}` });
            matchedFieldsSet.add('tags');
          }
        }
      }
    }

    // 3. Emotions Matching
    if (dream.emotions && dream.emotions.length > 0) {
      for (const emotion of dream.emotions) {
        const normEmo = normalizeText(emotion);
        if (normEmo === query || queryTokens.some((qt) => isFuzzyMatch(qt, normEmo))) {
          score += 35;
          if (!matchedFieldsSet.has('emotions')) {
            matchDetails.push({ field: 'emotions', label: `Emotion: ${emotion}` });
            matchedFieldsSet.add('emotions');
          }
        }
      }
    }

    // 4. Dream Signs Notes Matching
    const normSigns = normalizeText(dream.dreamSignsNotes);
    if (normSigns) {
      if (normSigns.includes(query)) {
        score += 35;
        matchDetails.push({ field: 'signs', label: 'Dream Signs' });
        matchedFieldsSet.add('signs');
      } else {
        const signTokens = normSigns.split(' ');
        const matched = queryTokens.filter((qt) => signTokens.some((st) => isFuzzyMatch(qt, st))).length;
        if (matched > 0) {
          score += matched * 12;
          matchDetails.push({ field: 'signs', label: 'Dream Signs' });
          matchedFieldsSet.add('signs');
        }
      }
    }

    // 5. Deep Content: Scenes (Title & Narrative)
    if (dream.scenes && dream.scenes.length > 0) {
      for (const scene of dream.scenes) {
        const sceneText = normalizeText(`${scene.title || ''} ${scene.narrative || ''}`);
        if (sceneText.includes(query)) {
          score += 30;
          if (!matchedFieldsSet.has('scenes')) {
            matchDetails.push({
              field: 'scenes',
              label: `Scene ${scene.sceneNumber}${scene.title ? `: ${scene.title}` : ''}`,
            });
            matchedFieldsSet.add('scenes');
          }
        } else {
          const sceneTokens = sceneText.split(' ');
          const matched = queryTokens.filter((qt) => sceneTokens.some((st) => isFuzzyMatch(qt, st))).length;
          if (matched > 0) {
            score += matched * 10;
            if (!matchedFieldsSet.has('scenes')) {
              matchDetails.push({ field: 'scenes', label: `Scene ${scene.sceneNumber}` });
              matchedFieldsSet.add('scenes');
            }
          }
        }
      }
    }

    // 6. Deep Content: Interpretation Notes (Private Reflections)
    const normInterp = normalizeText(dream.interpretationNotes);
    if (normInterp) {
      if (normInterp.includes(query)) {
        score += 30;
        matchDetails.push({ field: 'interpretation', label: 'Interpretation & Reflections' });
        matchedFieldsSet.add('interpretation');
      } else {
        const interpTokens = normInterp.split(' ');
        const matched = queryTokens.filter((qt) => interpTokens.some((it) => isFuzzyMatch(qt, it))).length;
        if (matched > 0) {
          score += matched * 10;
          matchDetails.push({ field: 'interpretation', label: 'Interpretation Notes' });
          matchedFieldsSet.add('interpretation');
        }
      }
    }

    // 7. Deep Content: Anomalies & False Awakening Details
    const faDetails = dream.falseAwakeningDetails;
    if (faDetails) {
      const anomalyText = normalizeText(
        `${faDetails.environmentDescription || ''} ${faDetails.triggerOrAnomaly || ''} ${
          faDetails.realityCheckNotes || ''
        }`
      );
      if (anomalyText.includes(query)) {
        score += 30;
        matchDetails.push({ field: 'anomaly', label: 'Recorded Anomaly / Trigger' });
        matchedFieldsSet.add('anomaly');
      } else {
        const anomTokens = anomalyText.split(' ');
        const matched = queryTokens.filter((qt) => anomTokens.some((at) => isFuzzyMatch(qt, at))).length;
        if (matched > 0) {
          score += matched * 10;
          matchDetails.push({ field: 'anomaly', label: 'Anomaly Notes' });
          matchedFieldsSet.add('anomaly');
        }
      }
    }

    // Useful reality checks list
    if (dream.realityChecksUseful && dream.realityChecksUseful.length > 0) {
      const rcText = normalizeText(dream.realityChecksUseful.join(' '));
      if (rcText.includes(query) || queryTokens.some((qt) => rcText.includes(qt))) {
        score += 20;
        if (!matchedFieldsSet.has('anomaly')) {
          matchDetails.push({ field: 'anomaly', label: 'Reality Checks' });
          matchedFieldsSet.add('anomaly');
        }
      }
    }

    // 8. Main Narrative Matching
    const normNarrative = normalizeText(dream.narrative);
    if (normNarrative) {
      if (normNarrative.includes(query)) {
        score += 25;
        if (!matchedFieldsSet.has('narrative')) {
          matchDetails.push({ field: 'narrative', label: 'Narrative' });
          matchedFieldsSet.add('narrative');
        }
      } else {
        const narrativeTokens = normNarrative.split(' ');
        const matched = queryTokens.filter((qt) => narrativeTokens.some((nt) => isFuzzyMatch(qt, nt))).length;
        if (matched > 0) {
          score += matched * 8;
          if (!matchedFieldsSet.has('narrative')) {
            matchDetails.push({ field: 'narrative', label: 'Narrative' });
            matchedFieldsSet.add('narrative');
          }
        }
      }
    }

    // 9. Semantic Concept / Thematic Expansion Matching
    if (matchedConcepts.length > 0) {
      for (const concept of matchedConcepts) {
        let conceptMatched = false;

        // Structured flag check
        if (concept.flagCheck && concept.flagCheck(dream)) {
          score += 35;
          conceptMatched = true;
        }

        // Thematic keywords check against dream composite text
        if (!conceptMatched) {
          const composite = `${normTitle} ${normNarrative} ${normSigns} ${normInterp}`;
          for (const kw of concept.relatedKeywords) {
            if (composite.includes(normalizeText(kw))) {
              score += 25;
              conceptMatched = true;
              break;
            }
          }
        }

        if (conceptMatched && !matchedFieldsSet.has('semantic')) {
          matchDetails.push({
            field: 'semantic',
            label: `Thematic: ${concept.name}`,
          });
          matchedFieldsSet.add('semantic');
        }
      }
    }

    // Only include if score > 0
    if (score > 0) {
      results.push({
        dream,
        score,
        matchDetails,
      });
    }
  }

  // Sort by relevance score descending, tie-break by date/createdAt descending
  return results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const dateComp = b.dream.date.localeCompare(a.dream.date);
    if (dateComp !== 0) return dateComp;
    return (b.dream.createdAt || 0) - (a.dream.createdAt || 0);
  });
}

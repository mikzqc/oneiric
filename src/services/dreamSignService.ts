import { db } from '../db/database';
import { DreamEntry } from '../types/dream';
import {
  DreamSign,
  DreamSignCategory,
  DreamSignDraft,
  DreamSignStatus,
} from '../types/dreamSign';

// Comprehensive stopword list for future NLP extensions
const _STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d',
  'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these',
  'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
  'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why',
  'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'dream', 'dreamed',
  'dreaming', 'woke', 'waking', 'remember', 'felt', 'seemed', 'looked', 'saw', 'went',
  'came', 'said', 'told', 'tried', 'started', 'around', 'back', 'just', 'like', 'really',
  'something', 'someone', 'somewhere', 'another', 'first', 'second', 'still', 'even',
]);

// Curated heuristic dictionary for dream signs recognition
export const DEFAULT_PATTERN_RULES: {
  name: string;
  category: DreamSignCategory;
  keywords: string[];
}[] = [
  // Anomalies & Superhuman
  { name: 'Flying / Levitation', category: 'anomaly', keywords: ['flying', 'fly', 'flight', 'levitate', 'levitating', 'hovering', 'gliding'] },
  { name: 'Breathing Underwater', category: 'anomaly', keywords: ['underwater breathing', 'breathe underwater', 'breathing underwater', 'submerged breathing'] },
  { name: 'Impossible Physics', category: 'anomaly', keywords: ['gravity', 'floating', 'impossible physics', 'upside down', 'teleport', 'teleporting', 'telekinesis'] },
  { name: 'Metamorphosis / Shapeshifting', category: 'anomaly', keywords: ['morphing', 'shapeshift', 'shapeshifting', 'transforming', 'transformed'] },
  { name: 'Time Distortions', category: 'anomaly', keywords: ['time travel', 'frozen time', 'looping time', 'clock running backward'] },

  // Objects
  { name: 'Mirrors & Reflections', category: 'object', keywords: ['mirror', 'mirrors', 'reflection', 'reflections', 'glass reflection'] },
  { name: 'Clocks & Timepieces', category: 'object', keywords: ['clock', 'clocks', 'watch', 'watches', 'digital clock', 'hourglass'] },
  { name: 'Malfunctioning Technology', category: 'object', keywords: ['phone', 'smartphone', 'dialing', 'screen glitch', 'computer', 'lights won\'t turn on', 'switch'] },
  { name: 'Elevators & Escalators', category: 'object', keywords: ['elevator', 'elevators', 'escalator', 'falling elevator', 'runaway elevator'] },
  { name: 'Vehicles & Driving', category: 'object', keywords: ['car', 'driving', 'brakes failed', 'brakes', 'train', 'airplane', 'bus'] },
  { name: 'Keys & Locked Doors', category: 'object', keywords: ['key', 'keys', 'locked door', 'locking', 'lockbox', 'padlock'] },

  // Locations
  { name: 'Bioluminescent / Deep Ocean', category: 'location', keywords: ['ocean', 'sea', 'coast', 'waves', 'shore', 'deep water'] },
  { name: 'Forests & Nature Canopies', category: 'location', keywords: ['forest', 'woods', 'trees', 'jungle', 'grove', 'rainforest'] },
  { name: 'Labyrinths & Endless Corridors', category: 'location', keywords: ['labyrinth', 'maze', 'hallway', 'corridor', 'tunnels', 'basement'] },
  { name: 'Academic Buildings & Classrooms', category: 'location', keywords: ['school', 'classroom', 'university', 'college', 'exam', 'campus'] },
  { name: 'Celestial / Cosmic Space', category: 'location', keywords: ['space', 'stars', 'cosmos', 'galaxy', 'planet', 'moon', 'nebula', 'spire'] },
  { name: 'Childhood Home', category: 'location', keywords: ['childhood home', 'old house', 'childhood bedroom', 'parent\'s house'] },

  // People
  { name: 'Shadow Figures & Strangers', category: 'person', keywords: ['shadow figure', 'shadowy figure', 'faceless stranger', 'stranger', 'intruder'] },
  { name: 'Deceased Relatives', category: 'person', keywords: ['grandfather', 'grandmother', 'passed away', 'ancestor', 'ghost'] },
  { name: 'Family Members', category: 'person', keywords: ['mother', 'father', 'brother', 'sister', 'mom', 'dad'] },
  { name: 'Celebrities & Fictional Characters', category: 'person', keywords: ['celebrity', 'actor', 'fictional character', 'superhero'] },

  // Actions & Situations
  { name: 'Falling Sensation', category: 'action', keywords: ['falling', 'free fall', 'plunging', 'fell from', 'cliff edge'] },
  { name: 'Pursuit / Being Chased', category: 'action', keywords: ['chased', 'being chased', 'pursued', 'running away', 'escaping', 'hiding'] },
  { name: 'Lost / Disoriented', category: 'action', keywords: ['lost', 'can\'t find way', 'wandering', 'stranded', 'seeking exit'] },
  { name: 'Teeth Falling Out', category: 'action', keywords: ['teeth', 'tooth', 'teeth falling', 'loose teeth', 'crumbling teeth'] },
  { name: 'Unprepared for Exam / Public', category: 'action', keywords: ['unprepared', 'test', 'exam', 'naked in public', 'forgot clothes'] },
];

/**
 * Normalizes text for keyword matching: removes punctuation, lowercases, cleans whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a specific keyword phrase is present in normalized text with word boundary awareness.
 */
export function matchesKeyword(normalizedText: string, keyword: string): boolean {
  const normKw = normalizeText(keyword);
  if (!normKw) return false;

  // Exact word-boundary regular expression
  const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i');
  return regex.test(normalizedText);
}

export const dreamSignService = {
  async getAllSigns(): Promise<DreamSign[]> {
    return await db.dreamSigns.orderBy('distinctDreamCount').reverse().toArray();
  },

  async getSuggestedSigns(): Promise<DreamSign[]> {
    return await db.dreamSigns.where('status').equals('suggested').toArray();
  },

  async getConfirmedSigns(): Promise<DreamSign[]> {
    return await db.dreamSigns.where('status').equals('confirmed').toArray();
  },

  async getSignById(id: string): Promise<DreamSign | undefined> {
    return await db.dreamSigns.get(id);
  },

  async createSign(draft: DreamSignDraft): Promise<DreamSign> {
    const now = Date.now();
    const cleanKeywords = Array.from(
      new Set(draft.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))
    );

    const sign: DreamSign = {
      ...draft,
      status: draft.status || 'confirmed',
      id: crypto.randomUUID ? crypto.randomUUID() : `sign-${now}-${Math.random().toString(36).substring(2, 8)}`,
      keywords: cleanKeywords,
      linkedDreamIds: draft.linkedDreamIds || [],
      distinctDreamCount: draft.linkedDreamIds?.length || 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.dreamSigns.add(sign);
    return sign;
  },

  async updateSign(id: string, updates: Partial<DreamSignDraft>): Promise<void> {
    const existing = await db.dreamSigns.get(id);
    if (!existing) {
      throw new Error(`Dream sign "${id}" not found.`);
    }

    const cleanKeywords = updates.keywords
      ? Array.from(new Set(updates.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)))
      : existing.keywords;

    await db.dreamSigns.update(id, {
      ...updates,
      keywords: cleanKeywords,
      distinctDreamCount: updates.linkedDreamIds ? updates.linkedDreamIds.length : existing.distinctDreamCount,
      updatedAt: Date.now(),
    });
  },

  async deleteSign(id: string): Promise<void> {
    await db.dreamSigns.delete(id);
  },

  async toggleRealityCheckReminder(id: string): Promise<boolean> {
    const sign = await db.dreamSigns.get(id);
    if (!sign) return false;

    const nextState = !sign.isRealityCheckReminder;
    await db.dreamSigns.update(id, {
      isRealityCheckReminder: nextState,
      updatedAt: Date.now(),
    });
    return nextState;
  },

  async setSignStatus(id: string, status: DreamSignStatus): Promise<void> {
    await db.dreamSigns.update(id, {
      status,
      updatedAt: Date.now(),
    });
  },

  /**
   * Merges a source dream sign into a target sign.
   * Combines keywords, merges distinct dream IDs, updates counts, and deletes the source sign.
   */
  async mergeSigns(sourceId: string, targetId: string): Promise<DreamSign> {
    const [source, target] = await Promise.all([
      db.dreamSigns.get(sourceId),
      db.dreamSigns.get(targetId),
    ]);

    if (!source || !target) {
      throw new Error('Both source and target dream signs must exist to merge.');
    }

    // Combine keywords
    const combinedKeywords = Array.from(
      new Set([...target.keywords, ...source.keywords, source.name.toLowerCase(), target.name.toLowerCase()])
    );

    // Combine unique linked dream IDs
    const targetDreamIds = target.linkedDreamIds || [];
    const sourceDreamIds = source.linkedDreamIds || [];
    const combinedDreamIds = Array.from(
      new Set([...targetDreamIds, ...sourceDreamIds])
    );

    // Latest occurred date
    const lastOccurred =
      target.lastOccurred && source.lastOccurred
        ? target.lastOccurred > source.lastOccurred
          ? target.lastOccurred
          : source.lastOccurred
        : target.lastOccurred || source.lastOccurred;

    const mergedNotes = [target.userNotes, source.userNotes].filter(Boolean).join('\n---\n');

    await db.transaction('rw', [db.dreamSigns], async () => {
      await db.dreamSigns.update(targetId, {
        keywords: combinedKeywords,
        linkedDreamIds: combinedDreamIds,
        distinctDreamCount: combinedDreamIds.length,
        lastOccurred,
        userNotes: mergedNotes || undefined,
        updatedAt: Date.now(),
      });
      await db.dreamSigns.delete(sourceId);
    });

    const updated = await db.dreamSigns.get(targetId);
    return updated!;
  },

  /**
   * Scans all stored dreams against known dream signs and dictionary rules.
   * Recalculates occurrences and discovers candidate signs appearing in >= 2 distinct dreams.
   */
  async scanAndDetectSigns(): Promise<{
    updatedSignsCount: number;
    newSuggestionsCount: number;
  }> {
    const dreams = await db.dreams.toArray();
    const existingSigns = await db.dreamSigns.toArray();

    // Map dream ID -> combined normalized searchable text
    const dreamTextMap = new Map<string, { date: string; text: string }>();
    for (const dream of dreams) {
      const fullText = [
        dream.title,
        dream.narrative,
        dream.dreamSignsNotes || '',
        ...(dream.tags || []),
      ].join(' ');
      dreamTextMap.set(dream.id, {
        date: dream.date,
        text: normalizeText(fullText),
      });
    }

    // 1. Update existing confirmed/suggested/dismissed signs
    let updatedSignsCount = 0;
    for (const sign of existingSigns) {
      const matchedDreamIds = new Set<string>();
      let latestDate: string | undefined = undefined;

      const allSearchTerms = [sign.name.toLowerCase(), ...sign.keywords];

      for (const [dreamId, dreamData] of dreamTextMap.entries()) {
        const matchesAny = allSearchTerms.some((term) => matchesKeyword(dreamData.text, term));
        if (matchesAny) {
          matchedDreamIds.add(dreamId);
          if (!latestDate || dreamData.date > latestDate) {
            latestDate = dreamData.date;
          }
        }
      }

      const distinctCount = matchedDreamIds.size;
      const idsArray = Array.from(matchedDreamIds);

      // Persist updated occurrences
      await db.dreamSigns.update(sign.id, {
        linkedDreamIds: idsArray,
        distinctDreamCount: distinctCount,
        lastOccurred: latestDate || sign.lastOccurred,
        updatedAt: Date.now(),
      });
      updatedSignsCount++;
    }

    // 2. Discover new recurring candidate signs from DEFAULT_PATTERN_RULES
    const existingSignNames = new Set(existingSigns.map((s) => s.name.toLowerCase()));
    let newSuggestionsCount = 0;

    for (const rule of DEFAULT_PATTERN_RULES) {
      if (existingSignNames.has(rule.name.toLowerCase())) {
        continue;
      }

      const matchedDreamIds = new Set<string>();
      let latestDate: string | undefined = undefined;

      for (const [dreamId, dreamData] of dreamTextMap.entries()) {
        const matchesAny = rule.keywords.some((term) => matchesKeyword(dreamData.text, term));
        if (matchesAny) {
          matchedDreamIds.add(dreamId);
          if (!latestDate || dreamData.date > latestDate) {
            latestDate = dreamData.date;
          }
        }
      }

      // STRICT RULE: Only label pattern recurring if it appears across >= 2 distinct dreams!
      if (matchedDreamIds.size >= 2) {
        const idsArray = Array.from(matchedDreamIds);
        await this.createSign({
          name: rule.name,
          category: rule.category,
          keywords: rule.keywords,
          status: 'suggested', // requires user confirmation
          linkedDreamIds: idsArray,
          distinctDreamCount: idsArray.length,
          lastOccurred: latestDate,
          isRealityCheckReminder: false,
        });
        newSuggestionsCount++;
      }
    }

    return { updatedSignsCount, newSuggestionsCount };
  },

  /**
   * Returns dreams linked to a dream sign
   */
  async getLinkedDreams(signId: string): Promise<DreamEntry[]> {
    const sign = await db.dreamSigns.get(signId);
    if (!sign || !sign.linkedDreamIds || sign.linkedDreamIds.length === 0) {
      return [];
    }
    const dreams = await db.dreams.where('id').anyOf(sign.linkedDreamIds).toArray();
    // Sort descending by date
    return dreams.sort((a, b) => b.date.localeCompare(a.date));
  },
};

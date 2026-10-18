import { db } from '../db/database';
import { DreamEntry } from '../types/dream';
import {
  DreamSign,
  DreamSignCategory,
  DreamSignDraft,
  DreamSignStatus,
} from '../types/dreamSign';
import { tombstoneService } from '../utils/tombstones';
import { syncService } from './syncService';

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

// Local storage key for deleted / permanently ignored dream sign names
const IGNORED_SIGNS_STORAGE_KEY = 'oneiric_ignored_signs';

export function getIgnoredSignNames(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(IGNORED_SIGNS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function ignoreSignName(name: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const trimmed = name.toLowerCase().trim();
    if (!trimmed) return;
    const names = new Set(getIgnoredSignNames().map((n) => n.toLowerCase().trim()));
    names.add(trimmed);
    localStorage.setItem(IGNORED_SIGNS_STORAGE_KEY, JSON.stringify(Array.from(names)));
  } catch (e) {
    console.error('Failed to save ignored sign name', e);
  }
}

export function unignoreSignName(name: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const trimmed = name.toLowerCase().trim();
    if (!trimmed) return;
    const names = new Set(getIgnoredSignNames().map((n) => n.toLowerCase().trim()));
    names.delete(trimmed);
    localStorage.setItem(IGNORED_SIGNS_STORAGE_KEY, JSON.stringify(Array.from(names)));
  } catch (e) {
    console.error('Failed to unignore sign name', e);
  }
}

export function clearIgnoredSignNames(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(IGNORED_SIGNS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear ignored sign names', e);
  }
}

let activeScanPromise: Promise<{ updatedSignsCount: number; newSuggestionsCount: number }> | null = null;

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

  async getDismissedSigns(): Promise<DreamSign[]> {
    return await db.dreamSigns.where('status').equals('dismissed').toArray();
  },

  async getSignById(id: string): Promise<DreamSign | undefined> {
    return await db.dreamSigns.get(id);
  },

  async createSign(draft: DreamSignDraft): Promise<DreamSign> {
    const now = Date.now();
    const cleanKeywords = Array.from(
      new Set(draft.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))
    );

    // If it's a suggested candidate from auto-scan, avoid duplicate creation or resurrection if ignored
    if (draft.status === 'suggested') {
      const ignored = new Set(getIgnoredSignNames().map((n) => n.toLowerCase()));
      if (ignored.has(draft.name.toLowerCase())) {
        return {
          id: 'ignored',
          name: draft.name,
          category: draft.category,
          keywords: cleanKeywords,
          status: 'dismissed',
          linkedDreamIds: [],
          distinctDreamCount: 0,
          createdAt: now,
          updatedAt: now,
        };
      }
      const existing = await db.dreamSigns.where('name').equalsIgnoreCase(draft.name).first();
      if (existing) {
        return existing;
      }
    }

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

  /**
   * Permanently deletes a sign. When preventRecreation is true (default), records its name
   * in the ignored list so automated pattern scans will not resurrect it as a suggestion.
   * Also safely removes any matching duplicates by name.
   */
  async deleteSign(id: string, preventRecreation = true): Promise<void> {
    tombstoneService.recordDeletion(id);
    const sign = await db.dreamSigns.get(id);
    if (sign && preventRecreation) {
      ignoreSignName(sign.name);
    }
    if (sign) {
      const allMatching = await db.dreamSigns
        .where('name')
        .equalsIgnoreCase(sign.name)
        .toArray();
      for (const m of allMatching) {
        tombstoneService.recordDeletion(m.id);
        await db.dreamSigns.delete(m.id);
      }
    } else {
      await db.dreamSigns.delete(id);
    }
    syncService.triggerAutoSync({ immediate: true });
  },

  /**
   * Bulk deletes multiple signs with failure tolerance and reporting.
   */
  async deleteMultipleSigns(
    ids: string[],
    preventRecreation = true
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        await this.deleteSign(id, preventRecreation);
        succeeded.push(id);
      } catch (err) {
        console.error(`Failed to delete sign ${id}`, err);
        failed.push(id);
      }
    }

    return { succeeded, failed };
  },

  /**
   * Dismisses a sign (hides it from active views and correlations, but preserves it in the library).
   */
  async dismissSign(id: string): Promise<void> {
    await this.setSignStatus(id, 'dismissed');
  },

  /**
   * Bulk dismisses multiple signs with failure tolerance and reporting.
   */
  async dismissMultipleSigns(ids: string[]): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        await this.setSignStatus(id, 'dismissed');
        succeeded.push(id);
      } catch (err) {
        console.error(`Failed to dismiss sign ${id}`, err);
        failed.push(id);
      }
    }

    return { succeeded, failed };
  },

  /**
   * Restores a dismissed or previously ignored sign back into confirmed/suggested status.
   */
  async restoreSign(id: string, nextStatus: DreamSignStatus = 'confirmed'): Promise<void> {
    const sign = await db.dreamSigns.get(id);
    if (sign) {
      unignoreSignName(sign.name);
    }
    await this.setSignStatus(id, nextStatus);
  },

  /**
   * Bulk restores multiple signs.
   */
  async restoreMultipleSigns(
    ids: string[],
    nextStatus: DreamSignStatus = 'confirmed'
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        await this.restoreSign(id, nextStatus);
        succeeded.push(id);
      } catch (err) {
        console.error(`Failed to restore sign ${id}`, err);
        failed.push(id);
      }
    }

    return { succeeded, failed };
  },

  /**
   * Scope B: Unlinks a sign from a specific dream entry without altering the dream narrative or tags.
   * Adds the dreamId to excludedDreamIds so future automatic scans will never re-link it.
   */
  async unlinkSignFromDream(signId: string, dreamId: string): Promise<DreamSign> {
    const sign = await db.dreamSigns.get(signId);
    if (!sign) {
      throw new Error(`Dream sign "${signId}" not found.`);
    }

    const currentExcluded = new Set(sign.excludedDreamIds || []);
    currentExcluded.add(dreamId);

    const currentLinked = (sign.linkedDreamIds || []).filter((id) => id !== dreamId);

    let nextLastOccurred: string | undefined = undefined;
    if (currentLinked.length > 0) {
      const remainingDreams = await db.dreams.where('id').anyOf(currentLinked).toArray();
      if (remainingDreams.length > 0) {
        remainingDreams.sort((a, b) => b.date.localeCompare(a.date));
        nextLastOccurred = remainingDreams[0].date;
      }
    }

    await db.dreamSigns.update(signId, {
      excludedDreamIds: Array.from(currentExcluded),
      linkedDreamIds: currentLinked,
      distinctDreamCount: currentLinked.length,
      lastOccurred: nextLastOccurred,
      updatedAt: Date.now(),
    });

    const updated = await db.dreamSigns.get(signId);
    return updated!;
  },

  /**
   * Re-links a dream to a sign, removing it from excludedDreamIds if present.
   */
  async linkSignToDream(signId: string, dreamId: string): Promise<DreamSign> {
    const sign = await db.dreamSigns.get(signId);
    if (!sign) {
      throw new Error(`Dream sign "${signId}" not found.`);
    }

    const currentExcluded = (sign.excludedDreamIds || []).filter((id) => id !== dreamId);
    const currentLinked = new Set(sign.linkedDreamIds || []);
    currentLinked.add(dreamId);

    await db.dreamSigns.update(signId, {
      excludedDreamIds: currentExcluded,
      linkedDreamIds: Array.from(currentLinked),
      distinctDreamCount: currentLinked.size,
      updatedAt: Date.now(),
    });

    const updated = await db.dreamSigns.get(signId);
    return updated!;
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
   * Uses an in-flight promise lock to prevent concurrent redundant scans and race conditions.
   */
  async scanAndDetectSigns(): Promise<{
    updatedSignsCount: number;
    newSuggestionsCount: number;
  }> {
    if (activeScanPromise) {
      return activeScanPromise;
    }

    activeScanPromise = (async () => {
      try {
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
        // Skip dream if explicitly unlinked/excluded by user from this sign
        if (sign.excludedDreamIds && sign.excludedDreamIds.includes(dreamId)) {
          continue;
        }

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
        lastOccurred: distinctCount === 0 ? undefined : (latestDate || sign.lastOccurred),
        updatedAt: Date.now(),
      });
      updatedSignsCount++;
    }

    // 2. Discover new recurring candidate signs from DEFAULT_PATTERN_RULES
    const existingSignNames = new Set(existingSigns.map((s) => s.name.toLowerCase()));
    const ignoredNames = new Set(getIgnoredSignNames().map((n) => n.toLowerCase()));
    let newSuggestionsCount = 0;

    for (const rule of DEFAULT_PATTERN_RULES) {
      const lowerRuleName = rule.name.toLowerCase();
      if (existingSignNames.has(lowerRuleName) || ignoredNames.has(lowerRuleName)) {
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
  } finally {
    activeScanPromise = null;
  }
})();

return activeScanPromise;
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

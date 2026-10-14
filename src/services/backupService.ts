import { db } from '../db/database';
import { BackupPayload, ImportValidationResult } from '../types/backup';
import { DreamEntry } from '../types/dream';
import { TechniqueLog } from '../types/technique';
import { DreamSign } from '../types/dreamSign';
import { generateSampleData } from '../db/sampleData';

const SAMPLE_PREVIEW_SESSION_KEY = 'oneiric_sample_preview_active';

export const backupService = {
  async exportData(): Promise<BackupPayload> {
    // Exclude any ephemeral sample preview data from export
    const dreams = (await db.dreams.toArray()).filter((d) => !d.isSample);
    const techniqueLogs = (await db.techniqueLogs.toArray()).filter((t) => !t.isSample);
    const customTags = await db.customTags.toArray();
    const dreamSigns = (await db.dreamSigns.toArray()).filter((s) => !s.isSample);

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      source: 'oneiric',
      dreams,
      techniqueLogs,
      customTags,
      dreamSigns,
    };
  },

  validateImportData(jsonString: string): ImportValidationResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { valid: false, error: 'The uploaded file is not valid JSON.' };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Backup root must be a JSON object.' };
    }

    const payload = parsed as Record<string, unknown>;

    // Validate version and source (support version 1 and 2)
    if (payload.version !== 1 && payload.version !== 2) {
      return { valid: false, error: 'Unsupported backup version. Expected version 1 or 2.' };
    }

    if (payload.source !== 'oneiric') {
      return { valid: false, error: 'Unrecognized backup source. Expected "oneiric".' };
    }

    if (!Array.isArray(payload.dreams)) {
      return { valid: false, error: 'Backup does not contain a valid dreams array.' };
    }

    // Validate individual dreams
    for (let i = 0; i < payload.dreams.length; i++) {
      const dream = payload.dreams[i];
      if (!dream || typeof dream !== 'object') {
        return { valid: false, error: `Dream entry at index ${i} is not a valid object.` };
      }
      const d = dream as Partial<DreamEntry>;
      if (!d.id || typeof d.id !== 'string') {
        return { valid: false, error: `Dream entry #${i + 1} is missing a valid id.` };
      }
      if (!d.title || typeof d.title !== 'string') {
        return { valid: false, error: `Dream entry #${i + 1} is missing a title.` };
      }
      if (typeof d.narrative !== 'string') {
        return { valid: false, error: `Dream entry "${d.title}" is missing a narrative.` };
      }
      if (!d.date || typeof d.date !== 'string') {
        return { valid: false, error: `Dream entry "${d.title}" is missing a valid date.` };
      }
      if (!['non-lucid', 'lucid', 'uncertain'].includes(d.lucidity || '')) {
        return { valid: false, error: `Dream entry "${d.title}" has an invalid lucidity status.` };
      }
    }

    // Validate technique logs if present
    if (payload.techniqueLogs !== undefined) {
      if (!Array.isArray(payload.techniqueLogs)) {
        return { valid: false, error: 'techniqueLogs must be an array.' };
      }
      for (let i = 0; i < payload.techniqueLogs.length; i++) {
        const log = payload.techniqueLogs[i];
        if (!log || typeof log !== 'object') {
          return { valid: false, error: `Technique log at index ${i} is not an object.` };
        }
        const l = log as Partial<TechniqueLog>;
        if (!l.id || !l.date || !l.technique || !l.outcome) {
          return { valid: false, error: `Technique log #${i + 1} is missing required fields.` };
        }
      }
    }

    // Validate dream signs if present
    if (payload.dreamSigns !== undefined) {
      if (!Array.isArray(payload.dreamSigns)) {
        return { valid: false, error: 'dreamSigns must be an array.' };
      }
      for (let i = 0; i < payload.dreamSigns.length; i++) {
        const sign = payload.dreamSigns[i];
        if (!sign || typeof sign !== 'object') {
          return { valid: false, error: `Dream sign at index ${i} is not an object.` };
        }
        const s = sign as Partial<DreamSign>;
        if (!s.id || !s.name || !s.category || !s.status) {
          return { valid: false, error: `Dream sign #${i + 1} is missing required fields.` };
        }
      }
    }

    const typedData = payload as unknown as BackupPayload;
    const dreamCount = typedData.dreams.length;
    const lucidCount = typedData.dreams.filter((d) => d.lucidity === 'lucid').length;
    const falseAwakeningCount = typedData.dreams.filter((d) => !!d.falseAwakening).length;
    const techniqueCount = typedData.techniqueLogs?.length || 0;
    const dreamSignCount = typedData.dreamSigns?.length || 0;

    return {
      valid: true,
      data: typedData,
      stats: {
        dreamCount,
        lucidCount,
        techniqueCount,
        dreamSignCount,
        falseAwakeningCount,
      },
    };
  },

  async importData(
    payload: BackupPayload,
    mode: 'merge' | 'replace'
  ): Promise<{ dreamCount: number; techniqueCount: number; signCount: number }> {
    const signs = payload.dreamSigns || [];

    if (mode === 'replace') {
      await db.transaction('rw', [db.dreams, db.techniqueLogs, db.customTags, db.dreamSigns], async () => {
        await db.dreams.clear();
        await db.techniqueLogs.clear();
        await db.customTags.clear();
        await db.dreamSigns.clear();

        if (payload.dreams.length > 0) {
          await db.dreams.bulkAdd(payload.dreams);
        }
        if (payload.techniqueLogs && payload.techniqueLogs.length > 0) {
          await db.techniqueLogs.bulkAdd(payload.techniqueLogs);
        }
        if (payload.customTags && payload.customTags.length > 0) {
          await db.customTags.bulkAdd(payload.customTags);
        }
        if (signs.length > 0) {
          await db.dreamSigns.bulkAdd(signs);
        }
      });
    } else {
      // Merge mode
      await db.transaction('rw', [db.dreams, db.techniqueLogs, db.customTags, db.dreamSigns], async () => {
        if (payload.dreams.length > 0) {
          await db.dreams.bulkPut(payload.dreams);
        }
        if (payload.techniqueLogs && payload.techniqueLogs.length > 0) {
          await db.techniqueLogs.bulkPut(payload.techniqueLogs);
        }
        if (payload.customTags && payload.customTags.length > 0) {
          await db.customTags.bulkPut(payload.customTags);
        }
        if (signs.length > 0) {
          await db.dreamSigns.bulkPut(signs);
        }
      });
    }

    return {
      dreamCount: payload.dreams.length,
      techniqueCount: payload.techniqueLogs?.length || 0,
      signCount: signs.length,
    };
  },

  async wipeAllData(): Promise<void> {
    await db.transaction('rw', [db.dreams, db.techniqueLogs, db.customTags, db.dreamSigns], async () => {
      await db.dreams.clear();
      await db.techniqueLogs.clear();
      await db.customTags.clear();
      await db.dreamSigns.clear();
    });
    try {
      sessionStorage.removeItem(SAMPLE_PREVIEW_SESSION_KEY);
      window.dispatchEvent(new CustomEvent('oneiric:sample-data-changed'));
    } catch {
      // ignore
    }
  },

  /**
   * Loads sample data for interactive preview in the current session.
   * Disappears upon page refresh.
   */
  async loadSampleData(): Promise<{ dreamCount: number; techniqueCount: number; signCount: number }> {
    const { dreams, techniqueLogs, dreamSigns } = generateSampleData();

    await db.transaction('rw', [db.dreams, db.techniqueLogs, db.dreamSigns], async () => {
      // Clean previous samples first to avoid duplicates
      await db.dreams.filter((d) => !!d.isSample).delete();
      await db.techniqueLogs.filter((l) => !!l.isSample).delete();
      await db.dreamSigns.filter((s) => !!s.isSample).delete();

      await db.dreams.bulkAdd(dreams);
      await db.techniqueLogs.bulkAdd(techniqueLogs);
      await db.dreamSigns.bulkAdd(dreamSigns);
    });

    try {
      sessionStorage.setItem(SAMPLE_PREVIEW_SESSION_KEY, 'true');
      window.dispatchEvent(new CustomEvent('oneiric:sample-data-changed'));
    } catch {
      // ignore
    }

    return {
      dreamCount: dreams.length,
      techniqueCount: techniqueLogs.length,
      signCount: dreamSigns.length,
    };
  },

  /**
   * Cleans up any sample preview data immediately.
   */
  async clearSampleData(): Promise<number> {
    let removed = 0;
    await db.transaction('rw', [db.dreams, db.techniqueLogs, db.dreamSigns], async () => {
      const dreamCount = await db.dreams.filter((d) => !!d.isSample).delete();
      const techCount = await db.techniqueLogs.filter((l) => !!l.isSample).delete();
      const signCount = await db.dreamSigns.filter((s) => !!s.isSample).delete();
      removed = dreamCount + techCount + signCount;
    });

    try {
      sessionStorage.removeItem(SAMPLE_PREVIEW_SESSION_KEY);
      window.dispatchEvent(new CustomEvent('oneiric:sample-data-changed'));
    } catch {
      // ignore
    }

    return removed;
  },

  /**
   * Automatically clears temporary sample exploration preview on page startup/refresh.
   * Real user entries are preserved intact.
   */
  async cleanupSamplePreviewOnStartup(): Promise<number> {
    let removed = 0;
    try {
      await db.transaction('rw', [db.dreams, db.techniqueLogs, db.dreamSigns], async () => {
        const dreamCount = await db.dreams.filter((d) => !!d.isSample).delete();
        const techCount = await db.techniqueLogs.filter((l) => !!l.isSample).delete();
        const signCount = await db.dreamSigns.filter((s) => !!s.isSample).delete();
        removed = dreamCount + techCount + signCount;
      });
      sessionStorage.removeItem(SAMPLE_PREVIEW_SESSION_KEY);
    } catch {
      // ignore error during startup
    }
    return removed;
  },

  async hasSampleData(): Promise<boolean> {
    const sampleDream = await db.dreams.filter((d) => !!d.isSample).first();
    if (sampleDream) return true;
    const sampleTech = await db.techniqueLogs.filter((l) => !!l.isSample).first();
    if (sampleTech) return true;
    const sampleSign = await db.dreamSigns.filter((s) => !!s.isSample).first();
    return !!sampleSign;
  },
};

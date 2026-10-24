import { db } from '../db/database';
import { BackupPayload, EncryptedBackupEnvelope, ImportValidationResult } from '../types/backup';
import { DreamEntry } from '../types/dream';
import { TechniqueLog } from '../types/technique';
import { DreamSign } from '../types/dreamSign';
import { generateSampleData } from '../db/sampleData';
import { tombstoneService } from '../utils/tombstones';
import { cryptoService } from './cryptoService';
import { dreamSignService } from './dreamSignService';

const SAMPLE_PREVIEW_SESSION_KEY = 'oneiric_sample_preview_active';

export const backupService = {
  /**
   * Exports complete unencrypted JSON backup with full tombstones and metadata
   */
  async exportData(): Promise<BackupPayload> {
    // Exclude any ephemeral sample preview data from export
    const dreams = (await db.dreams.toArray()).filter((d) => !d.isSample);
    const techniqueLogs = (await db.techniqueLogs.toArray()).filter((t) => !t.isSample);
    const customTags = await db.customTags.toArray();
    const dreamSigns = (await db.dreamSigns.toArray()).filter((s) => !s.isSample);
    const deletedIds = tombstoneService.getDeletedIds();
    const tombstones = tombstoneService.getTombstonesMap();

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      source: 'oneiric',
      dreams,
      techniqueLogs,
      customTags,
      dreamSigns,
      deletedIds,
      tombstones,
    };
  },

  /**
   * Exports full journal archive encrypted with AES-256-GCM + PBKDF2 (100k iterations).
   * Secrets and passphrases are NEVER stored in the output.
   */
  async exportEncryptedBackup(passphrase: string): Promise<string> {
    const cleanPass = passphrase.trim();
    if (!cleanPass) {
      throw new Error('An encryption passphrase is required to export an encrypted backup.');
    }
    const data = await this.exportData();
    const encrypted = await cryptoService.encryptData(data, cleanPass);
    const envelope: EncryptedBackupEnvelope = {
      version: 2,
      source: 'oneiric',
      encrypted: true,
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iterations: 100000,
      exportedAt: new Date().toISOString(),
      salt: encrypted.salt,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
    };
    return JSON.stringify(envelope, null, 2);
  },

  /**
   * Detects if an uploaded JSON string is a password-protected encrypted backup
   */
  isEncryptedBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as Partial<EncryptedBackupEnvelope>;
      return Boolean(
        parsed &&
        typeof parsed === 'object' &&
        parsed.encrypted === true &&
        parsed.ciphertext &&
        parsed.salt &&
        parsed.iv
      );
    } catch {
      return false;
    }
  },

  /**
   * Decrypts an encrypted backup and validates the inner archive payload
   */
  async decryptAndValidateEncryptedBackup(
    jsonString: string,
    passphrase: string
  ): Promise<ImportValidationResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { valid: false, error: 'The uploaded file is not valid JSON.' };
    }

    const envelope = parsed as Partial<EncryptedBackupEnvelope>;
    if (!envelope.ciphertext || !envelope.salt || !envelope.iv) {
      return { valid: false, error: 'Malformed encrypted backup: missing cryptographic envelope parameters.' };
    }

    try {
      const decrypted = await cryptoService.decryptData<BackupPayload>(
        {
          ciphertext: envelope.ciphertext,
          salt: envelope.salt,
          iv: envelope.iv,
        },
        passphrase.trim()
      );
      return this.validateImportData(JSON.stringify(decrypted));
    } catch {
      return {
        valid: false,
        error: 'Decryption failed: Incorrect passphrase or the backup file has been tampered with or corrupted.',
      };
    }
  },

  /**
   * Validates plain JSON backup data according to the Oneiric specification
   */
  validateImportData(jsonString: string): ImportValidationResult {
    if (this.isEncryptedBackup(jsonString)) {
      return {
        valid: false,
        error: 'ENCRYPTED_BACKUP: This file is password-protected with AES-256-GCM. Please enter your passphrase to unlock it.',
      };
    }

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

  /**
   * Imports validated backup data with rock-solid conflict resolution and tombstone preservation
   */
  async importData(
    payload: BackupPayload,
    mode: 'merge' | 'replace'
  ): Promise<{ dreamCount: number; newDreamsCount: number; techniqueCount: number; signCount: number }> {
    const signs = payload.dreamSigns || [];
    let newDreamsCount = 0;

    if (mode === 'replace') {
      const currentCount = await db.dreams.count();
      // Safety guard: never wipe a populated journal if the incoming replacement has 0 dreams
      if (currentCount > 0 && payload.dreams.length === 0) {
        throw new Error(
          'Restoration aborted: Cannot replace a populated dream journal with an empty backup file. Use "Merge" or verify your backup file.'
        );
      }

      if (payload.tombstones && typeof payload.tombstones === 'object') {
        tombstoneService.mergeTombstones(payload.tombstones);
      } else if (payload.deletedIds && payload.deletedIds.length > 0) {
        tombstoneService.recordDeletions(payload.deletedIds);
      }

      newDreamsCount = payload.dreams.length;
      await db.transaction('rw', [db.dreams, db.techniqueLogs, db.customTags, db.dreamSigns], async () => {
        await db.dreams.clear();
        await db.techniqueLogs.clear();
        await db.customTags.clear();
        await db.dreamSigns.clear();

        if (payload.dreams.length > 0) {
          // Normalize dreams before insertion
          const normalized = payload.dreams.map((d) => ({
            ...d,
            tags: Array.isArray(d.tags) ? d.tags : [],
            emotions: Array.isArray(d.emotions) ? d.emotions : [],
            falseAwakening: Boolean(d.falseAwakening),
            scenesCount: d.scenesCount || (d.scenes?.length || 1),
            scenes: Array.isArray(d.scenes) ? d.scenes : [],
            createdAt: Number(d.createdAt) || Date.now(),
            updatedAt: Number(d.updatedAt) || Number(d.createdAt) || Date.now(),
          }));
          await db.dreams.bulkAdd(normalized);
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
      // Merge mode:
      // 1. Process incoming tombstones and handle deletion-versus-edit conflicts
      const incomingTombstones: Record<string, number> = {};
      if (payload.tombstones && typeof payload.tombstones === 'object') {
        Object.assign(incomingTombstones, payload.tombstones);
      }
      if (payload.deletedIds && Array.isArray(payload.deletedIds)) {
        for (const id of payload.deletedIds) {
          if (id && !incomingTombstones[id]) {
            incomingTombstones[id] = Date.now();
          }
        }
      }

      if (Object.keys(incomingTombstones).length > 0) {
        tombstoneService.mergeTombstones(incomingTombstones);
        await db.transaction('rw', [db.dreams, db.techniqueLogs, db.dreamSigns], async () => {
          for (const [delId, delTs] of Object.entries(incomingTombstones)) {
            const localDream = await db.dreams.get(delId);
            if (localDream) {
              const localUpdated = Number(localDream.updatedAt || localDream.createdAt || 0);
              // If local edit occurred strictly AFTER remote deletion, retain the edit and un-delete
              if (localUpdated > delTs) {
                tombstoneService.removeTombstone(delId);
              } else {
                await db.dreams.delete(delId);
              }
            }

            const localTech = await db.techniqueLogs.get(delId);
            if (localTech) {
              const localUpdated = Number(localTech.updatedAt || localTech.createdAt || 0);
              if (localUpdated > delTs) {
                tombstoneService.removeTombstone(delId);
              } else {
                await db.techniqueLogs.delete(delId);
              }
            }

            const localSign = await db.dreamSigns.get(delId);
            if (localSign) {
              const localUpdated = Number(localSign.updatedAt || localSign.createdAt || 0);
              if (localUpdated > delTs) {
                tombstoneService.removeTombstone(delId);
              } else {
                await db.dreamSigns.delete(delId);
              }
            }
          }
        });
      }

      // 2. Merge dreams with Last-Write-Wins and skip deleted items
      const dreamsToPut: DreamEntry[] = [];
      if (payload.dreams.length > 0) {
        const existingDreams = await db.dreams.toArray();
        const existingMap = new Map(existingDreams.map((d) => [d.id, d]));

        for (const dream of payload.dreams) {
          const incomingUpdated = Number(dream.updatedAt || dream.createdAt || 0);
          const delTimestamp = tombstoneService.getDeletionTimestamp(dream.id);

          if (delTimestamp !== null) {
            // If the incoming dream was edited strictly AFTER the deletion timestamp,
            // the user revived or modified it on the remote device. Remove tombstone and accept dream.
            if (incomingUpdated > delTimestamp) {
              tombstoneService.removeTombstone(dream.id);
            } else {
              // Deletion happened at or after this dream version: do not resurrect!
              continue;
            }
          }

          const existing = existingMap.get(dream.id);
          const normalizedDream: DreamEntry = {
            ...dream,
            tags: Array.isArray(dream.tags) ? dream.tags : [],
            emotions: Array.isArray(dream.emotions) ? dream.emotions : [],
            falseAwakening: Boolean(dream.falseAwakening),
            scenesCount: dream.scenesCount || (dream.scenes?.length || 1),
            scenes: Array.isArray(dream.scenes) ? dream.scenes : [],
            createdAt: Number(dream.createdAt) || Date.now(),
            updatedAt: incomingUpdated || Number(dream.createdAt) || Date.now(),
          };

          if (!existing) {
            newDreamsCount++;
            dreamsToPut.push(normalizedDream);
          } else {
            const existingUpdated = Number(existing.updatedAt || existing.createdAt || 0);
            if (incomingUpdated > existingUpdated) {
              dreamsToPut.push(normalizedDream);
            } else if (incomingUpdated === existingUpdated) {
              // Deterministic tie-breaker for identical timestamps: keep richer narrative
              if (JSON.stringify(normalizedDream) !== JSON.stringify(existing)) {
                if ((normalizedDream.narrative?.length || 0) > (existing.narrative?.length || 0)) {
                  dreamsToPut.push(normalizedDream);
                }
              }
            }
          }
        }
      }

      // 3. Merge technique logs and skip deleted items
      const techniquesToPut: TechniqueLog[] = [];
      if (payload.techniqueLogs && payload.techniqueLogs.length > 0) {
        const existingLogs = await db.techniqueLogs.toArray();
        const existingMap = new Map(existingLogs.map((t) => [t.id, t]));

        for (const log of payload.techniqueLogs) {
          const incomingUpdated = Number(log.updatedAt || log.createdAt || 0);
          const delTimestamp = tombstoneService.getDeletionTimestamp(log.id);

          if (delTimestamp !== null) {
            if (incomingUpdated > delTimestamp) {
              tombstoneService.removeTombstone(log.id);
            } else {
              continue;
            }
          }

          const existing = existingMap.get(log.id);
          if (!existing) {
            techniquesToPut.push(log);
          } else {
            const existingUpdated = Number(existing.updatedAt || existing.createdAt || 0);
            if (incomingUpdated >= existingUpdated) {
              techniquesToPut.push(log);
            }
          }
        }
      }

      // 4. Merge dream signs and skip deleted items
      const signsToPut: DreamSign[] = [];
      if (signs.length > 0) {
        const existingSigns = await db.dreamSigns.toArray();
        const existingById = new Map(existingSigns.map((s) => [s.id, s]));
        const existingByName = new Map(
          existingSigns.map((s) => [s.name.trim().toLowerCase(), s])
        );

        for (const sign of signs) {
          const incomingUpdated = Number(sign.updatedAt || sign.createdAt || 0);
          const delTimestamp = tombstoneService.getDeletionTimestamp(sign.id);

          if (delTimestamp !== null) {
            if (incomingUpdated > delTimestamp) {
              tombstoneService.removeTombstone(sign.id);
            } else {
              continue;
            }
          }

          const normName = sign.name.trim().toLowerCase();
          const existing = existingById.get(sign.id) || existingByName.get(normName);

          if (!existing) {
            signsToPut.push(sign);
            existingById.set(sign.id, sign);
            existingByName.set(normName, sign);
          } else {
            const existingUpdated = Number(existing.updatedAt || existing.createdAt || 0);

            // Combine keywords & linked dreams
            const combinedKeywords = Array.from(
              new Set([...(existing.keywords || []), ...(sign.keywords || [])])
            );
            const combinedLinked = Array.from(
              new Set([...(existing.linkedDreamIds || []), ...(sign.linkedDreamIds || [])])
            );

            const mergedSign: DreamSign = {
              ...existing,
              ...sign,
              id: existing.id, // Preserve existing ID to avoid duplicate rows
              keywords: combinedKeywords,
              linkedDreamIds: combinedLinked,
              distinctDreamCount: combinedLinked.length,
              status:
                existing.status === 'confirmed' || sign.status === 'confirmed'
                  ? 'confirmed'
                  : existing.status === 'suggested' || sign.status === 'suggested'
                  ? 'suggested'
                  : existing.status,
              isRealityCheckReminder:
                existing.isRealityCheckReminder || Boolean(sign.isRealityCheckReminder),
              updatedAt: Math.max(incomingUpdated, existingUpdated, Date.now()),
            };

            signsToPut.push(mergedSign);
            existingById.set(existing.id, mergedSign);
            existingByName.set(normName, mergedSign);
          }
        }
      }

      await db.transaction('rw', [db.dreams, db.techniqueLogs, db.customTags, db.dreamSigns], async () => {
        if (dreamsToPut.length > 0) {
          await db.dreams.bulkPut(dreamsToPut);
        }
        if (techniquesToPut.length > 0) {
          await db.techniqueLogs.bulkPut(techniquesToPut);
        }
        if (payload.customTags && payload.customTags.length > 0) {
          await db.customTags.bulkPut(payload.customTags);
        }
        if (signsToPut.length > 0) {
          await db.dreamSigns.bulkPut(signsToPut);
        }
      });

      await dreamSignService.consolidateDuplicateSigns();
    }

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oneiric:dream-saved'));
        window.dispatchEvent(new CustomEvent('oneiric:sample-data-changed'));
      }
    } catch {
      // Ignore in non-browser/test environments
    }

    return {
      dreamCount: payload.dreams.length,
      newDreamsCount,
      techniqueCount: payload.techniqueLogs?.length || 0,
      signCount: signs.length,
    };
  },

  /**
   * Securely wipes all local application data and clears tombstones
   */
  async wipeAllData(): Promise<void> {
    await db.transaction('rw', [db.dreams, db.techniqueLogs, db.customTags, db.dreamSigns], async () => {
      await db.dreams.clear();
      await db.techniqueLogs.clear();
      await db.customTags.clear();
      await db.dreamSigns.clear();
    });
    tombstoneService.clearTombstones();

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oneiric:dream-saved'));
        window.dispatchEvent(new CustomEvent('oneiric:sample-data-changed'));
      }
    } catch {
      // ignore
    }
  },

  /**
   * Loads sample data for new user exploration
   */
  async loadSampleData(): Promise<{ dreamCount: number; techniqueCount: number; signCount: number }> {
    const { dreams, techniqueLogs, dreamSigns } = generateSampleData();

    await db.transaction('rw', [db.dreams, db.techniqueLogs, db.dreamSigns], async () => {
      // Remove any prior sample items
      await db.dreams.filter((d) => !!d.isSample).delete();
      await db.techniqueLogs.filter((t) => !!t.isSample).delete();
      await db.dreamSigns.filter((s) => !!s.isSample).delete();

      await db.dreams.bulkAdd(dreams);
      await db.techniqueLogs.bulkAdd(techniqueLogs);
      await db.dreamSigns.bulkAdd(dreamSigns);
    });

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SAMPLE_PREVIEW_SESSION_KEY, 'true');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oneiric:sample-data-changed'));
      }
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
   * Cleans up sample entries permanently from database
   */
  async clearSampleData(): Promise<{ removedDreams: number; removedTechniques: number; removedSigns: number }> {
    let removedDreams = 0;
    let removedTechniques = 0;
    let removedSigns = 0;

    await db.transaction('rw', [db.dreams, db.techniqueLogs, db.dreamSigns], async () => {
      removedDreams = await db.dreams.filter((d) => !!d.isSample).delete();
      removedTechniques = await db.techniqueLogs.filter((t) => !!t.isSample).delete();
      removedSigns = await db.dreamSigns.filter((s) => !!s.isSample).delete();
    });

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(SAMPLE_PREVIEW_SESSION_KEY);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('oneiric:sample-data-changed'));
      }
    } catch {
      // ignore
    }

    return { removedDreams, removedTechniques, removedSigns };
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
        const techCount = await db.techniqueLogs.filter((t) => !!t.isSample).delete();
        const signCount = await db.dreamSigns.filter((s) => !!s.isSample).delete();
        removed = dreamCount + techCount + signCount;
      });
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(SAMPLE_PREVIEW_SESSION_KEY);
      }
    } catch {
      // ignore in non-browser/test environments
    }
    return removed;
  },

  /**
   * Checks if sample data currently exists in the database
   */
  async hasSampleData(): Promise<boolean> {
    const sampleDream = await db.dreams.filter((d) => !!d.isSample).first();
    const sampleTech = await db.techniqueLogs.filter((t) => !!t.isSample).first();
    const sampleSign = await db.dreamSigns.filter((s) => !!s.isSample).first();
    return Boolean(sampleDream || sampleTech || sampleSign);
  },
};

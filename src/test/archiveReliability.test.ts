import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/database';
import { backupService } from '../services/backupService';
import { syncService } from '../services/syncService';
import { tombstoneService } from '../utils/tombstones';
import { BackupPayload, EncryptedBackupEnvelope } from '../types/backup';
import { DreamEntry } from '../types/dream';

describe('Archive Reliability & Privacy Hardening Suite (Phase 7)', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
    await db.dreamSigns.clear();
    tombstoneService.clearTombstones();
    vi.restoreAllMocks();
  });

  describe('1. Backup & Restoration Integrity', () => {
    it('executes a lossless round-trip for plain JSON backup and restore', async () => {
      const sampleDream: DreamEntry = {
        id: 'dream-preserve-1',
        title: 'Lucid Starlight Observatory',
        narrative: 'Looking through the celestial telescope, the stars formed ancient equations.',
        date: '2026-10-24',
        vividness: 5,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        lucidityConfidence: 'certain',
        dreamControl: 4,
        scenesCount: 2,
        emotions: ['Wonder', 'Clarity'],
        tags: ['Observatory', 'Astronomy'],
        falseAwakening: false,
        createdAt: 1729780000000,
        updatedAt: 1729780000000,
        isSample: false,
      };
      await db.dreams.add(sampleDream);

      // Export unencrypted backup
      const exported = await backupService.exportData();
      expect(exported.version).toBe(2);
      expect(exported.source).toBe('oneiric');
      expect(exported.dreams.length).toBe(1);
      expect(exported.dreams[0].title).toBe('Lucid Starlight Observatory');

      // Clear local database
      await db.dreams.clear();
      expect(await db.dreams.count()).toBe(0);

      // Restore via merge
      const validation = backupService.validateImportData(JSON.stringify(exported));
      expect(validation.valid).toBe(true);
      if (validation.valid && validation.data) {
        await backupService.importData(validation.data, 'merge');
      }

      // Verify fully restored fields
      const restored = await db.dreams.get('dream-preserve-1');
      expect(restored).toBeDefined();
      expect(restored?.title).toBe('Lucid Starlight Observatory');
      expect(restored?.narrative).toContain('celestial telescope');
      expect(restored?.lucidity).toBe('lucid');
      expect(restored?.dreamControl).toBe(4);
      expect(restored?.emotions).toEqual(['Wonder', 'Clarity']);
      expect(restored?.tags).toEqual(['Observatory', 'Astronomy']);
    });

    it('rejects corrupted or truncated JSON backup without modifying existing database', async () => {
      await db.dreams.add({
        id: 'existing-dream-1',
        title: 'Original Saved Dream',
        narrative: 'Must not be touched by corrupt backup attempts.',
        date: '2026-10-20',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: [],
        tags: [],
        createdAt: 1729000000000,
        updatedAt: 1729000000000,
      });

      const corruptStrings = [
        '{ "version": 2, "source": "oneiric", "dreams": [ { "id": "part', // truncated json
        JSON.stringify({ version: 2, source: 'unauthorized_source', dreams: [] }), // bad source
        JSON.stringify({ version: 999, source: 'oneiric', dreams: [] }), // unsupported version
        JSON.stringify({ version: 2, source: 'oneiric', dreams: 'not-an-array' }), // invalid type
        JSON.stringify({
          version: 2,
          source: 'oneiric',
          dreams: [{ id: 'bad-1', title: 'Missing date and lucidity' }],
        }), // missing required schema fields
      ];

      for (const corrupt of corruptStrings) {
        const validation = backupService.validateImportData(corrupt);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      }

      // Ensure local database remains completely unaffected
      const remaining = await db.dreams.toArray();
      expect(remaining.length).toBe(1);
      expect(remaining[0].title).toBe('Original Saved Dream');
    });

    it('prevents accidental destructive wipe when replace mode is attempted with empty backup', async () => {
      await db.dreams.add({
        id: 'valuable-dream',
        title: 'Valuable Lifetime Journal Entry',
        narrative: 'Decades of lucid records.',
        date: '2026-10-24',
        vividness: 5,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Reverence'],
        tags: ['Important'],
        createdAt: 1729780000000,
        updatedAt: 1729780000000,
      });

      const emptyPayload: BackupPayload = {
        version: 2,
        source: 'oneiric',
        exportedAt: new Date().toISOString(),
        dreams: [],
        techniqueLogs: [],
      };

      // Attempting replace mode with empty payload on populated journal must throw safety guard
      await expect(backupService.importData(emptyPayload, 'replace')).rejects.toThrow(
        /Cannot replace a populated dream journal with an empty backup/
      );

      // Verify valuable dream was NOT deleted
      const count = await db.dreams.count();
      expect(count).toBe(1);
    });
  });

  describe('2. Client-Side Encryption & Security Verification', () => {
    it('executes AES-256-GCM encrypted backup export and decryption round-trip', async () => {
      const secretPassphrase = 'Oneiric-Correct-Horse-Battery-Staple-2026!';
      await db.dreams.add({
        id: 'encrypted-dream-1',
        title: 'Classified Subconscious Encounter',
        narrative: 'High privacy dream notes that must never be readable without passphrase.',
        date: '2026-10-24',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Secretive'],
        tags: ['Private'],
        createdAt: 1729781000000,
        updatedAt: 1729781000000,
      });

      const encryptedJson = await backupService.exportEncryptedBackup(secretPassphrase);
      expect(backupService.isEncryptedBackup(encryptedJson)).toBe(true);

      const envelope: EncryptedBackupEnvelope = JSON.parse(encryptedJson);
      expect(envelope.encrypted).toBe(true);
      expect(envelope.algorithm).toBe('AES-256-GCM');
      expect(envelope.kdf).toBe('PBKDF2-SHA256');
      expect(envelope.iterations).toBe(100000);
      expect(envelope.salt).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.ciphertext).toBeDefined();

      // Ensure raw narrative is NOT present as plaintext in the encrypted JSON
      expect(encryptedJson).not.toContain('Classified Subconscious Encounter');
      expect(encryptedJson).not.toContain('High privacy dream notes');
      expect(encryptedJson).not.toContain(secretPassphrase);

      // Decrypt and validate with correct passphrase
      const result = await backupService.decryptAndValidateEncryptedBackup(encryptedJson, secretPassphrase);
      expect(result.valid).toBe(true);
      expect(result.stats?.dreamCount).toBe(1);
      expect(result.data?.dreams[0].title).toBe('Classified Subconscious Encounter');
    });

    it('fails safely when decrypting with incorrect passphrase or tampered ciphertext', async () => {
      const originalPassphrase = 'Correct-Passphrase-2026';
      await db.dreams.add({
        id: 'tamper-test-dream',
        title: 'Tamper Protection Entry',
        narrative: 'Confidential narrative',
        date: '2026-10-24',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: [],
        tags: [],
        createdAt: 1729782000000,
        updatedAt: 1729782000000,
      });

      const encryptedJson = await backupService.exportEncryptedBackup(originalPassphrase);

      // 1. Wrong passphrase
      const wrongPassResult = await backupService.decryptAndValidateEncryptedBackup(
        encryptedJson,
        'Wrong-Passphrase-Attempt'
      );
      expect(wrongPassResult.valid).toBe(false);
      expect(wrongPassResult.error).toContain('Decryption failed');

      // 2. Tampered ciphertext (flip bits in base64 payload)
      const envelope: EncryptedBackupEnvelope = JSON.parse(encryptedJson);
      const tamperedCiphertext = envelope.ciphertext.slice(0, -6) + 'AAAA==';
      const tamperedEnvelope = { ...envelope, ciphertext: tamperedCiphertext };
      const tamperedJson = JSON.stringify(tamperedEnvelope);

      const tamperedResult = await backupService.decryptAndValidateEncryptedBackup(
        tamperedJson,
        originalPassphrase
      );
      expect(tamperedResult.valid).toBe(false);
      expect(tamperedResult.error).toContain('Decryption failed');
    });

    it('ensures encryption keys and passphrases are never leaked into console logs or warnings', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const sensitiveKey = 'SUPER_SECRET_USER_PASSPHRASE_NEVER_LEAK_12345';

      // Attempt invalid import with sensitive payload
      await expect(
        syncService.importEncryptedTransferCode('corrupt_transfer_token', sensitiveKey)
      ).rejects.toThrow();

      // Verify none of the console calls leaked the passphrase
      const allWarnCalls = consoleWarnSpy.mock.calls.flat().join(' ');
      const allErrCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(allWarnCalls).not.toContain(sensitiveKey);
      expect(allErrCalls).not.toContain(sensitiveKey);
    });
  });

  describe('3. Deletion Correctness & Tombstone Integrity', () => {
    it('prevents deleted dreams from resurrecting when an offline device re-synchronizes', async () => {
      // 1. Dream exists on Device A and Device B
      const sharedDream: DreamEntry = {
        id: 'dream-to-delete-1',
        title: 'Dream Destined For Deletion',
        narrative: 'User decides to remove this dream.',
        date: '2026-10-24',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: [],
        tags: [],
        createdAt: 1000,
        updatedAt: 1000,
      };

      // Device A deletes the dream at t = 2000
      tombstoneService.recordDeletion('dream-to-delete-1', 2000);
      expect(tombstoneService.isDeleted('dream-to-delete-1')).toBe(true);

      // Device B was offline and still has the dream with updatedAt = 1000
      // Device B exports its backup and tries to merge into Device A
      const deviceBBackup: BackupPayload = {
        version: 2,
        source: 'oneiric',
        exportedAt: new Date().toISOString(),
        dreams: [sharedDream],
        techniqueLogs: [],
      };

      await backupService.importData(deviceBBackup, 'merge');

      // The dream must NOT resurrect on Device A because deletion at 2000 > updatedAt 1000
      const localDream = await db.dreams.get('dream-to-delete-1');
      expect(localDream).toBeUndefined();
      expect(tombstoneService.isDeleted('dream-to-delete-1')).toBe(true);
    });

    it('allows intentional re-creation or newer edit of a previously deleted dream (edit-vs-deletion conflict)', async () => {
      // Old deletion tombstone at t = 1000
      tombstoneService.recordDeletion('dream-recreated-1', 1000);

      // User creates/edits the dream at t = 3000 on another device
      const newerDream: DreamEntry = {
        id: 'dream-recreated-1',
        title: 'Re-created Dream with Greater Detail',
        narrative: 'User intentionally re-recorded this experience after remembering new details.',
        date: '2026-10-24',
        vividness: 5,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Triumph'],
        tags: ['Revived'],
        createdAt: 3000,
        updatedAt: 3000,
      };

      const incomingBackup: BackupPayload = {
        version: 2,
        source: 'oneiric',
        exportedAt: new Date().toISOString(),
        dreams: [newerDream],
        techniqueLogs: [],
      };

      await backupService.importData(incomingBackup, 'merge');

      // The newer edit (t = 3000) MUST win over the older deletion (t = 1000)
      const stored = await db.dreams.get('dream-recreated-1');
      expect(stored).toBeDefined();
      expect(stored?.title).toBe('Re-created Dream with Greater Detail');
      // The tombstone must be cleared since the dream was intentionally revived
      expect(tombstoneService.isDeleted('dream-recreated-1')).toBe(false);
    });

    it('merges incoming remote tombstones and deletes older local entries', async () => {
      // Local dream has updatedAt = 1500
      await db.dreams.add({
        id: 'dream-deleted-remotely',
        title: 'Deleted on Remote Phone',
        narrative: 'Phone user deleted this entry.',
        date: '2026-10-24',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: [],
        tags: [],
        createdAt: 1000,
        updatedAt: 1500,
      });

      // Incoming payload includes tombstone from remote phone deleted at t = 2500
      const remotePayload: BackupPayload = {
        version: 2,
        source: 'oneiric',
        exportedAt: new Date().toISOString(),
        dreams: [],
        techniqueLogs: [],
        tombstones: {
          'dream-deleted-remotely': 2500,
        },
      };

      await backupService.importData(remotePayload, 'merge');

      // Local entry must be deleted and tombstone recorded locally
      const stored = await db.dreams.get('dream-deleted-remotely');
      expect(stored).toBeUndefined();
      expect(tombstoneService.isDeleted('dream-deleted-remotely')).toBe(true);
      expect(tombstoneService.getDeletionTimestamp('dream-deleted-remotely')).toBe(2500);
    });
  });

  describe('4. Sync Integrity & Deterministic Conflict Resolution', () => {
    it('is fully idempotent: repeated sync operations never duplicate records', async () => {
      const dreamA: DreamEntry = {
        id: 'idempotent-dream-1',
        title: 'Flying Over Snowy Mountains',
        narrative: 'Gliding effortlessly above frosty peaks.',
        date: '2026-10-24',
        vividness: 5,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Freedom'],
        tags: ['Flight', 'Snow'],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const payload: BackupPayload = {
        version: 2,
        source: 'oneiric',
        exportedAt: new Date().toISOString(),
        dreams: [dreamA],
        techniqueLogs: [],
      };

      // Perform import 3 consecutive times (simulating retried sync / network reconnects)
      await backupService.importData(payload, 'merge');
      await backupService.importData(payload, 'merge');
      await backupService.importData(payload, 'merge');

      const allDreams = await db.dreams.toArray();
      expect(allDreams.length).toBe(1);
      expect(allDreams[0].id).toBe('idempotent-dream-1');
    });

    it('resolves concurrent edits deterministically using timestamp tie-breaking without data loss', async () => {
      // Local version edited at t = 5000
      await db.dreams.add({
        id: 'concurrent-dream',
        title: 'Local Edits Title',
        narrative: 'Local refined narrative.',
        date: '2026-10-24',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Curiosity'],
        tags: ['Local'],
        createdAt: 1000,
        updatedAt: 5000,
      });

      // Remote version edited at t = 4000 (older edit)
      const olderRemotePayload: BackupPayload = {
        version: 2,
        source: 'oneiric',
        exportedAt: new Date().toISOString(),
        dreams: [
          {
            id: 'concurrent-dream',
            title: 'Older Remote Title',
            narrative: 'Older remote narrative.',
            date: '2026-10-24',
            vividness: 3,
            recallQuality: 'fragmentary',
            lucidity: 'non-lucid',
            emotions: [],
            tags: ['Remote'],
            createdAt: 1000,
            updatedAt: 4000,
          },
        ],
        techniqueLogs: [],
      };

      await backupService.importData(olderRemotePayload, 'merge');

      // Local newer edit (t = 5000) must be preserved intact
      let stored = await db.dreams.get('concurrent-dream');
      expect(stored?.title).toBe('Local Edits Title');
      expect(stored?.updatedAt).toBe(5000);

      // Now incoming has newer edit at t = 6000
      const newerRemotePayload: BackupPayload = {
        version: 2,
        source: 'oneiric',
        exportedAt: new Date().toISOString(),
        dreams: [
          {
            id: 'concurrent-dream',
            title: 'Newest Remote Winning Title',
            narrative: 'Newest remote narrative updated on laptop.',
            date: '2026-10-24',
            vividness: 5,
            recallQuality: 'crystal',
            lucidity: 'lucid',
            emotions: ['Triumph'],
            tags: ['Newest'],
            createdAt: 1000,
            updatedAt: 6000,
          },
        ],
        techniqueLogs: [],
      };

      await backupService.importData(newerRemotePayload, 'merge');

      // Remote newer edit (t = 6000) must win
      stored = await db.dreams.get('concurrent-dream');
      expect(stored?.title).toBe('Newest Remote Winning Title');
      expect(stored?.updatedAt).toBe(6000);
      expect(stored?.lucidity).toBe('lucid');
    });
  });

  describe('5. Schema Normalization & Migration Safety', () => {
    it('safely imports legacy v1 backups and normalizes missing fields without data corruption', async () => {
      // Legacy v1 backup missing v2 properties (scenesCount, dreamControl, lucidityConfidence, falseAwakening)
      const legacyV1Json = JSON.stringify({
        version: 1,
        source: 'oneiric',
        exportedAt: '2026-01-01T00:00:00.000Z',
        dreams: [
          {
            id: 'legacy-dream-1',
            title: 'Ancient Dream from Version 1',
            narrative: 'Recorded in the first prototype of Oneiric.',
            date: '2026-01-01',
            vividness: 3,
            recallQuality: 'detailed',
            lucidity: 'non-lucid',
            emotions: ['Nostalgia'],
            tags: ['Archive'],
            createdAt: 1704067200000,
            updatedAt: 1704067200000,
          },
        ],
        techniqueLogs: [
          {
            id: 'legacy-tech-1',
            date: '2026-01-01',
            technique: 'MILD',
            outcome: 'lucid',
            createdAt: 1704067200000,
          },
        ],
      });

      const validation = backupService.validateImportData(legacyV1Json);
      expect(validation.valid).toBe(true);
      expect(validation.stats?.dreamCount).toBe(1);

      if (validation.valid && validation.data) {
        await backupService.importData(validation.data, 'merge');
      }

      const importedDream = await db.dreams.get('legacy-dream-1');
      expect(importedDream).toBeDefined();
      expect(importedDream?.title).toBe('Ancient Dream from Version 1');
      // Normalized defaults for v2 fields
      expect(importedDream?.falseAwakening).toBe(false);
      expect(importedDream?.scenes).toEqual([]);
      expect(importedDream?.tags).toEqual(['Archive']);
      expect(importedDream?.emotions).toEqual(['Nostalgia']);

      const importedTech = await db.techniqueLogs.get('legacy-tech-1');
      expect(importedTech).toBeDefined();
      expect(importedTech?.technique).toBe('MILD');
    });
  });
});

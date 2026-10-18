import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/database';
import { dreamService } from '../services/dreamService';
import { dreamSignService } from '../services/dreamSignService';
import { backupService } from '../services/backupService';
import { correlationService } from '../services/correlationService';
import { DreamScene } from '../types/dream';

describe('Functionality Audit & Reliability Verification', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
    await db.dreamSigns.clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Multi-scene structured dreams', () => {
    it('persists and retrieves structured multi-scene dream entries with scene-specific lucidity', async () => {
      const scenes: DreamScene[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          title: 'Wandering the Labyrinth',
          narrative: 'Walking through winding corridors of mirrors.',
          lucid: false,
          falseAwakening: false,
        },
        {
          id: 'scene-2',
          sceneNumber: 2,
          title: 'Spontaneous Lucidity',
          narrative: 'Looking down at my reflective hands and recognizing the dream state.',
          lucid: true,
          falseAwakening: false,
        },
        {
          id: 'scene-3',
          sceneNumber: 3,
          title: 'Morning Alarm Loop',
          narrative: 'Thought I woke up at my desk, but the digital clock was spinning.',
          lucid: true,
          falseAwakening: true,
        },
      ];

      const created = await dreamService.createDream({
        title: 'Three-Stage Multi-Scene Sequence',
        narrative: 'A journey through mirrors leading to lucidity and a false awakening.',
        date: '2026-10-16',
        vividness: 4,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Wonder', 'Curiosity'],
        tags: ['Mirrors', 'Multi-Scene'],
        scenesCount: 3,
        scenes,
      });

      expect(created.scenes).toBeDefined();
      expect(created.scenes?.length).toBe(3);
      expect(created.scenes?.[0].title).toBe('Wandering the Labyrinth');
      expect(created.scenes?.[1].lucid).toBe(true);
      expect(created.scenes?.[2].falseAwakening).toBe(true);

      const retrieved = await dreamService.getDreamById(created.id);
      expect(retrieved?.scenes?.length).toBe(3);
      expect(retrieved?.scenes?.[1].narrative).toContain('reflective hands');
    });
  });

  describe('Reactive custom event dispatches', () => {
    it('dispatches oneiric:dream-saved on dream creation, update, and deletion', async () => {
      const savedListener = vi.fn();
      window.addEventListener('oneiric:dream-saved', savedListener);

      const created = await dreamService.createDream({
        title: 'Event Dispatch Test',
        narrative: 'Testing reactive notifications across views.',
        date: '2026-10-15',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Serenity'],
        tags: ['Event'],
      });

      expect(savedListener).toHaveBeenCalledTimes(1);

      await dreamService.updateDream(created.id, { title: 'Updated Event Title' });
      expect(savedListener).toHaveBeenCalledTimes(2);

      await dreamService.deleteDream(created.id);
      expect(savedListener).toHaveBeenCalledTimes(3);

      window.removeEventListener('oneiric:dream-saved', savedListener);
    });

    it('dispatches oneiric:dream-saved and oneiric:sample-data-changed on backup import', async () => {
      const dreamSavedListener = vi.fn();
      const sampleChangedListener = vi.fn();

      window.addEventListener('oneiric:dream-saved', dreamSavedListener);
      window.addEventListener('oneiric:sample-data-changed', sampleChangedListener);

      await backupService.importData(
        {
          version: 2,
          exportDate: new Date().toISOString(),
          dreams: [
            {
              id: 'imported-dream-1',
              title: 'Imported Dream',
              narrative: 'Arrived via sync or file import.',
              date: '2026-10-14',
              vividness: 4,
              recallQuality: 'detailed',
              lucidity: 'lucid',
              emotions: ['Joy'],
              tags: ['Sync'],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          techniqueLogs: [],
          customTags: [],
          dreamSigns: [],
        },
        'merge'
      );

      expect(dreamSavedListener).toHaveBeenCalled();
      expect(sampleChangedListener).toHaveBeenCalled();

      window.removeEventListener('oneiric:dream-saved', dreamSavedListener);
      window.removeEventListener('oneiric:sample-data-changed', sampleChangedListener);
    });
  });

  describe('Dream sign lastOccurred recalculation and clearing', () => {
    it('clears lastOccurred to undefined when the only linked dream is unlinked', async () => {
      const dream = await dreamService.createDream({
        title: 'Ocean flight',
        narrative: 'Flying over blue waves.',
        date: '2026-10-10',
        vividness: 5,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Euphoria'],
        tags: ['Flying'],
      });

      const sign = await dreamSignService.createSign({
        name: 'Flying',
        category: 'action',
        keywords: ['flying', 'soaring'],
      });

      // Link dream
      await dreamSignService.linkSignToDream(sign.id, dream.id);
      await db.dreamSigns.update(sign.id, { lastOccurred: '2026-10-10' });

      let signRecord = await db.dreamSigns.get(sign.id);
      expect(signRecord?.linkedDreamIds).toContain(dream.id);
      expect(signRecord?.lastOccurred).toBe('2026-10-10');

      // Unlink the dream
      await dreamSignService.unlinkSignFromDream(sign.id, dream.id);

      signRecord = await db.dreamSigns.get(sign.id);
      expect(signRecord?.distinctDreamCount).toBe(0);
      expect(signRecord?.linkedDreamIds?.length).toBe(0);
      expect(signRecord?.lastOccurred).toBeUndefined();
    });

    it('recalculates lastOccurred to latest remaining dream date when one of multiple dreams is unlinked', async () => {
      const dream1 = await dreamService.createDream({
        title: 'Earlier Ocean Flight',
        narrative: 'Flying over ocean.',
        date: '2026-10-05',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Joy'],
        tags: ['Flying'],
      });

      const dream2 = await dreamService.createDream({
        title: 'Recent Mountain Flight',
        narrative: 'Flying over snowy summits.',
        date: '2026-10-15',
        vividness: 5,
        recallQuality: 'crystal',
        lucidity: 'lucid',
        emotions: ['Awe'],
        tags: ['Flying'],
      });

      const sign = await dreamSignService.createSign({
        name: 'Flying Action',
        category: 'action',
        keywords: ['flying'],
      });

      await dreamSignService.linkSignToDream(sign.id, dream1.id);
      await dreamSignService.linkSignToDream(sign.id, dream2.id);
      await db.dreamSigns.update(sign.id, { lastOccurred: '2026-10-15' });

      // Unlink the more recent dream (2026-10-15)
      await dreamSignService.unlinkSignFromDream(sign.id, dream2.id);

      const signRecord = await db.dreamSigns.get(sign.id);
      expect(signRecord?.distinctDreamCount).toBe(1);
      expect(signRecord?.linkedDreamIds).toEqual([dream1.id]);
      expect(signRecord?.lastOccurred).toBe('2026-10-05');
    });
  });

  describe('Correlation Engine sample data fallback', () => {
    it('analyzes sample data when no user dreams exist so users can explore correlations', async () => {
      // Insert sample dreams
      await db.dreams.bulkAdd([
        {
          id: 'sample-1',
          title: 'Sample Lucid Hand Check',
          narrative: 'Looked at hands and recognized the dream.',
          date: '2026-10-12',
          vividness: 5,
          recallQuality: 'crystal',
          lucidity: 'lucid',
          emotions: ['Wonder'],
          tags: ['Hands'],
          isSample: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'sample-2',
          title: 'Sample Hazy Library',
          narrative: 'Reading strange letters in a library.',
          date: '2026-10-13',
          vividness: 3,
          recallQuality: 'hazy',
          lucidity: 'non-lucid',
          emotions: ['Curiosity'],
          tags: ['Reading'],
          isSample: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      const report = await correlationService.computeCorrelations({
        timeRange: 'all',
        lucidityFilter: 'all',
        signStatus: 'all_active',
        minOccurrences: 1,
      });

      expect(report.totalDreamsAnalyzed).toBe(2);
      expect(report.totalLucidDreams).toBe(1);
      expect(report.baselineLucidityRate).toBe(50);
    });
  });

  describe('Multi-device sync reliability & canonical relay', () => {
    it('uses canonical cloud relay endpoint by default across devices', async () => {
      const { getRelayUrl, CANONICAL_CLOUD_RELAY } = await import('../services/syncService');
      expect(CANONICAL_CLOUD_RELAY).toBe('https://oneiric-one.vercel.app/api/vault');
      expect(getRelayUrl(undefined, 'my-vault-123')).toBe(
        'https://oneiric-one.vercel.app/api/vault?id=my-vault-123'
      );
      expect(getRelayUrl('https://custom-relay.example.com', 'my-vault-123')).toBe(
        'https://custom-relay.example.com/my-vault-123'
      );
    });

    it('accurately counts genuinely new dreams vs existing duplicates on import', async () => {
      const existing = await dreamService.createDream({
        title: 'Original Dream',
        narrative: 'Already stored locally.',
        date: '2026-10-17',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Joy'],
        tags: ['Local'],
      });

      const importResult = await backupService.importData(
        {
          version: 2,
          exportDate: new Date().toISOString(),
          dreams: [
            existing, // Duplicate
            {
              id: 'brand-new-mobile-dream',
              title: 'Mobile Dream Added Today',
              narrative: 'Synced from phone.',
              date: '2026-10-18',
              vividness: 5,
              recallQuality: 'crystal',
              lucidity: 'lucid',
              emotions: ['Awe'],
              tags: ['Mobile'],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          techniqueLogs: [],
          customTags: [],
          dreamSigns: [],
        },
        'merge'
      );

      expect(importResult.dreamCount).toBe(2);
      expect(importResult.newDreamsCount).toBe(1);
    });
  });
});

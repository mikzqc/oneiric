import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { dreamDumpService } from '../services/dreamDumpService';
import { goalService } from '../services/goalService';
import { backupService } from '../services/backupService';
import { tombstoneService } from '../utils/tombstones';

describe('Dream Dump & Goals Services', () => {
  beforeEach(async () => {
    await db.dreamDumps.clear();
    await db.goals.clear();
    await db.dreams.clear();
    localStorage.clear();
  });

  describe('dreamDumpService', () => {
    it('creates and retrieves dream dump fragments in newest-first order', async () => {
      const note1 = await dreamDumpService.createNote('I saw an emerald green bird in a glass garden.');
      // Small delay to ensure timestamp progression
      await new Promise((r) => setTimeout(r, 10));
      const note2 = await dreamDumpService.createNote('Woke up feeling like I was in an elevator.');

      const all = await dreamDumpService.getAllNotes();
      expect(all.length).toBe(2);
      expect(all[0].id).toBe(note2.id);
      expect(all[1].id).toBe(note1.id);
      expect(all[0].content).toContain('elevator');
    });

    it('updates note content and updates the timestamp', async () => {
      const note = await dreamDumpService.createNote('Initial thought');
      const originalTs = note.updatedAt;

      await new Promise((r) => setTimeout(r, 10));
      const updated = await dreamDumpService.updateNote(note.id, 'Expanded narrative with more details.');

      expect(updated.content).toBe('Expanded narrative with more details.');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(originalTs);

      const fetched = await dreamDumpService.getNoteById(note.id);
      expect(fetched?.content).toBe('Expanded narrative with more details.');
    });

    it('deletes note and records a tombstone for sync', async () => {
      const note = await dreamDumpService.createNote('Fragment to delete');
      await dreamDumpService.deleteNote(note.id);

      const fetched = await dreamDumpService.getNoteById(note.id);
      expect(fetched).toBeUndefined();

      const tombstoneTs = tombstoneService.getDeletionTimestamp(note.id);
      expect(tombstoneTs).not.toBeNull();
    });

    it('marks fragment as converted without deleting it', async () => {
      const note = await dreamDumpService.createNote('Fragment destined for dream entry');
      await dreamDumpService.markConverted(note.id, 'dream-123');

      const fetched = await dreamDumpService.getNoteById(note.id);
      expect(fetched).toBeDefined();
      expect(fetched?.isConverted).toBe(true);
      expect(fetched?.convertedToDreamId).toBe('dream-123');
      expect(fetched?.content).toBe('Fragment destined for dream entry');
    });

    it('prunes empty untouched notes while keeping the active one', async () => {
      const empty1 = await dreamDumpService.createNote('   ');
      const empty2 = await dreamDumpService.createNote('');
      const populated = await dreamDumpService.createNote('Valid memory');

      const pruned = await dreamDumpService.pruneEmptyNotes(empty1.id);
      expect(pruned).toBe(1); // empty2 pruned, empty1 preserved because it was marked active

      const remaining = await dreamDumpService.getAllNotes();
      expect(remaining.map((n) => n.id)).toContain(empty1.id);
      expect(remaining.map((n) => n.id)).toContain(populated.id);
      expect(remaining.map((n) => n.id)).not.toContain(empty2.id);
    });
  });

  describe('goalService', () => {
    it('creates, retrieves, and categorizes personal intentions', async () => {
      const goal = await goalService.createGoal({
        title: 'Recognize the nose-pinch reality check',
        description: 'Perform reality check whenever passing through doorways',
        category: 'Lucid Dreaming',
        targetDate: '2026-12-31',
      });

      expect(goal.id).toBeDefined();
      expect(goal.status).toBe('active');
      expect(goal.title).toBe('Recognize the nose-pinch reality check');

      const all = await goalService.getAllGoals();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(goal.id);

      const activeOnly = await goalService.getGoalsByStatus('active');
      expect(activeOnly.length).toBe(1);
    });

    it('supports completing, reactivating, and archiving goals', async () => {
      const goal = await goalService.createGoal({
        title: 'Maintain dream recall streak for 7 nights',
      });

      // Complete
      const completed = await goalService.setGoalStatus(goal.id, 'completed');
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();

      let completedList = await goalService.getGoalsByStatus('completed');
      expect(completedList.length).toBe(1);
      let activeList = await goalService.getGoalsByStatus('active');
      expect(activeList.length).toBe(0);

      // Reactivate
      const reactivated = await goalService.setGoalStatus(goal.id, 'active');
      expect(reactivated.status).toBe('active');
      expect(reactivated.completedAt).toBeUndefined();

      activeList = await goalService.getGoalsByStatus('active');
      expect(activeList.length).toBe(1);

      // Archive
      const archived = await goalService.setGoalStatus(goal.id, 'archived');
      expect(archived.status).toBe('archived');
      const archivedList = await goalService.getGoalsByStatus('archived');
      expect(archivedList.length).toBe(1);
    });

    it('updates goal fields correctly', async () => {
      const goal = await goalService.createGoal({
        title: 'Initial Title',
      });

      const updated = await goalService.updateGoal(goal.id, {
        title: 'Updated Intention Title',
        description: 'New detailed notes',
        category: 'Mindfulness',
      });

      expect(updated.title).toBe('Updated Intention Title');
      expect(updated.description).toBe('New detailed notes');
      expect(updated.category).toBe('Mindfulness');
    });

    it('deletes goal and records a tombstone', async () => {
      const goal = await goalService.createGoal({ title: 'Goal to remove' });
      await goalService.deleteGoal(goal.id);

      const fetched = await goalService.getGoalById(goal.id);
      expect(fetched).toBeUndefined();

      const tombstoneTs = tombstoneService.getDeletionTimestamp(goal.id);
      expect(tombstoneTs).not.toBeNull();
    });
  });

  describe('Backup & Encryption Round-Trip', () => {
    it('exports dreamDumps and goals in backup data', async () => {
      await dreamDumpService.createNote('Dump fragment for backup');
      await goalService.createGoal({ title: 'Goal for backup', category: 'Exploration' });

      const exported = await backupService.exportData();
      expect(exported.dreamDumps).toBeDefined();
      expect(exported.dreamDumps?.length).toBe(1);
      expect(exported.dreamDumps?.[0].content).toBe('Dump fragment for backup');

      expect(exported.goals).toBeDefined();
      expect(exported.goals?.length).toBe(1);
      expect(exported.goals?.[0].title).toBe('Goal for backup');
    });

    it('validates and imports backup payload in replace mode', async () => {
      const exported = await backupService.exportData();
      exported.dreams = [
        {
          id: 'test-dream-1',
          date: '2026-11-24',
          title: 'Imported Dream',
          narrative: 'Testing import',
          vividness: 4,
          recallQuality: 'detailed',
          lucidity: 'non-lucid',
          emotions: [],
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      exported.dreamDumps = [
        {
          id: 'dump-imported-1',
          content: 'Imported fragment',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      exported.goals = [
        {
          id: 'goal-imported-1',
          title: 'Imported Intention',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const validation = backupService.validateImportData(JSON.stringify(exported));
      expect(validation.valid).toBe(true);
      expect(validation.stats?.dumpCount).toBe(1);
      expect(validation.stats?.goalCount).toBe(1);

      await backupService.importData(exported, 'replace');

      const dumps = await dreamDumpService.getAllNotes();
      expect(dumps.length).toBe(1);
      expect(dumps[0].id).toBe('dump-imported-1');

      const goals = await goalService.getAllGoals();
      expect(goals.length).toBe(1);
      expect(goals[0].id).toBe('goal-imported-1');
    });
  });
});

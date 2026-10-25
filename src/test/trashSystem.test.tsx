import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { db } from '../db/database';
import { dreamService } from '../services/dreamService';
import { trashService, TRASH_MAX_AGE_MS } from '../utils/trashService';
import { tombstoneService } from '../utils/tombstones';
import { backupService } from '../services/backupService';
import { RecentlyDeletedCard } from '../components/settings/RecentlyDeletedCard';
import { UndoNotification } from '../components/common/UndoNotification';
import { DreamEntry } from '../types/dream';

describe('Recently Deleted & Undo Delete System', () => {
  const sampleDream: DreamEntry = {
    id: 'dream-trash-1',
    title: 'The Starlit Citadel',
    narrative: 'Walking along battlements surrounded by floating aurora ribbons.',
    date: '2026-10-24',
    wakeUpTime: '07:15',
    vividness: 4,
    recallQuality: 'crystal',
    lucidity: 'lucid',
    emotions: ['Awe', 'Serenity'],
    tags: ['Lucid Induction', 'Space'],
    falseAwakening: false,
    dreamControl: 4,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  beforeEach(async () => {
    localStorage.clear();
    trashService.clearMemoryFallback();
    await db.dreams.clear();
    vi.clearAllMocks();
  });

  it('Scenario 1: Delete → Undo restores the dream with exact ID and content, removing tombstones', async () => {
    await db.dreams.put(sampleDream);
    expect(await db.dreams.get(sampleDream.id)).toBeDefined();

    render(<UndoNotification />);

    // Delete dream
    await act(async () => {
      await dreamService.deleteDream(sampleDream.id);
    });

    // Verify removed from DB and in trash
    expect(await db.dreams.get(sampleDream.id)).toBeUndefined();
    expect(trashService.getTrash()).toHaveLength(1);
    expect(trashService.getTrash()[0].dream.id).toBe(sampleDream.id);

    // Verify Undo notification is shown
    expect(await screen.findByText(/Deleted "The Starlit Citadel"/i)).toBeInTheDocument();
    const undoButton = screen.getByRole('button', { name: /Undo/i });

    // Click Undo
    await act(async () => {
      fireEvent.click(undoButton);
    });

    // Verify dream is restored to DB
    await waitFor(async () => {
      const restored = await db.dreams.get(sampleDream.id);
      expect(restored).toBeDefined();
      expect(restored?.title).toBe('The Starlit Citadel');
      expect(restored?.narrative).toBe('Walking along battlements surrounded by floating aurora ribbons.');
      expect(restored?.lucidity).toBe('lucid');
      expect(restored?.dreamControl).toBe(4);
    });

    // Verify tombstone is removed so sync won't re-delete it
    expect(tombstoneService.isDeleted(sampleDream.id)).toBe(false);

    // Verify removed from trash
    expect(trashService.getTrash()).toHaveLength(0);
  });

  it('Scenario 2: Delete → Recently Deleted → Restore via Settings Card', async () => {
    await db.dreams.put(sampleDream);
    await dreamService.deleteDream(sampleDream.id);

    const onFeedback = vi.fn();
    render(<RecentlyDeletedCard onFeedback={onFeedback} />);

    // Verify dream row exists in Recently Deleted
    expect(screen.getByText('The Starlit Citadel')).toBeInTheDocument();
    expect(screen.getByText(/Expires in 30 days/i)).toBeInTheDocument();
    expect(screen.getByText('Lucid')).toBeInTheDocument();

    // Click Restore
    const restoreBtn = screen.getByRole('button', { name: /Restore/i });
    fireEvent.click(restoreBtn);

    await waitFor(async () => {
      const inDb = await db.dreams.get(sampleDream.id);
      expect(inDb).toBeDefined();
      expect(inDb?.id).toBe(sampleDream.id);
    });

    expect(onFeedback).toHaveBeenCalledWith('success', expect.stringContaining('Restored "The Starlit Citadel"'));

    // Should now show empty state in card
    await waitFor(() => {
      expect(screen.getByText(/Recently Deleted is empty/i)).toBeInTheDocument();
    });
  });

  it('Scenario 3: Trashed dreams survive reloads and remounts', async () => {
    await db.dreams.put(sampleDream);
    await dreamService.deleteDream(sampleDream.id);

    // Verify persisted in localStorage
    const raw = localStorage.getItem('oneiric_dream_trash');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed[0].dream.title).toBe('The Starlit Citadel');

    // Mount RecentlyDeletedCard (simulating fresh page load)
    const { unmount } = render(<RecentlyDeletedCard onFeedback={vi.fn()} />);
    expect(screen.getByText('The Starlit Citadel')).toBeInTheDocument();
    unmount();

    // Re-mount
    render(<RecentlyDeletedCard onFeedback={vi.fn()} />);
    expect(screen.getByText('The Starlit Citadel')).toBeInTheDocument();
  });

  it('Scenario 4: Permanent deletion requires confirmation and records permanent tombstone', async () => {
    await db.dreams.put(sampleDream);
    await dreamService.deleteDream(sampleDream.id);

    const onFeedback = vi.fn();
    render(<RecentlyDeletedCard onFeedback={onFeedback} />);

    // Click "Delete Permanently"
    const permDeleteBtn = screen.getByRole('button', { name: /Delete Permanently/i });
    fireEvent.click(permDeleteBtn);

    // Confirm dialog must appear
    expect(screen.getByText(/Permanently Delete Dream/i)).toBeInTheDocument();
    expect(screen.getByText(/This cannot be undone and cannot be recovered from trash/i)).toBeInTheDocument();

    // Click confirm in dialog
    const confirmButtons = screen.getAllByRole('button', { name: /Delete Permanently/i });
    // Dialog's confirm button is the last one
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(trashService.getTrash()).toHaveLength(0);
    });

    expect(onFeedback).toHaveBeenCalledWith('success', expect.stringContaining('permanently deleted'));

    // Permanent tombstone must be active
    expect(tombstoneService.isDeleted(sampleDream.id)).toBe(true);

    // Cannot be restored anymore
    const failedRestore = await dreamService.restoreFromTrash(sampleDream.id);
    expect(failedRestore).toBeUndefined();
  });

  it('Scenario 5: Empty Trash permanently clears all deleted dreams with confirmation', async () => {
    const dreamA = { ...sampleDream, id: 'dream-a', title: 'Dream Alpha' };
    const dreamB = { ...sampleDream, id: 'dream-b', title: 'Dream Beta' };

    await db.dreams.put(dreamA);
    await db.dreams.put(dreamB);
    await dreamService.deleteDream('dream-a');
    await dreamService.deleteDream('dream-b');

    expect(trashService.getTrash()).toHaveLength(2);

    const onFeedback = vi.fn();
    render(<RecentlyDeletedCard onFeedback={onFeedback} />);

    const emptyTrashBtn = screen.getByRole('button', { name: /Empty Trash/i });
    fireEvent.click(emptyTrashBtn);

    // Confirm dialog
    expect(screen.getByText(/Empty Recently Deleted/i)).toBeInTheDocument();
    const dialogConfirmBtn = screen.getAllByRole('button', { name: /Empty Trash/i });
    fireEvent.click(dialogConfirmBtn[dialogConfirmBtn.length - 1]);

    await waitFor(() => {
      expect(trashService.getTrash()).toHaveLength(0);
    });

    expect(tombstoneService.isDeleted('dream-a')).toBe(true);
    expect(tombstoneService.isDeleted('dream-b')).toBe(true);
    expect(onFeedback).toHaveBeenCalledWith('success', expect.stringContaining('permanently cleared'));
  });

  it('Scenario 6: Auto-pruning expires items older than 30 days', () => {
    const expiredDeletedAt = Date.now() - (TRASH_MAX_AGE_MS + 1000 * 60 * 60 * 24); // 31 days ago
    const activeDeletedAt = Date.now() - (1000 * 60 * 60 * 24 * 5); // 5 days ago

    const rawList = [
      { dream: { ...sampleDream, id: 'expired-dream', title: 'Ancient Memory' }, deletedAt: expiredDeletedAt },
      { dream: { ...sampleDream, id: 'active-dream', title: 'Recent Memory' }, deletedAt: activeDeletedAt },
    ];

    localStorage.setItem('oneiric_dream_trash', JSON.stringify(rawList));

    const trash = trashService.getTrash();
    expect(trash).toHaveLength(1);
    expect(trash[0].dream.id).toBe('active-dream');

    // Storage is updated to prune the expired entry
    const updatedRaw = JSON.parse(localStorage.getItem('oneiric_dream_trash')!);
    expect(updatedRaw).toHaveLength(1);
    expect(updatedRaw[0].dream.id).toBe('active-dream');
  });

  it('Scenario 7: Tombstone cleanup and cloud sync resolution on restore', async () => {
    await db.dreams.put(sampleDream);
    await dreamService.deleteDream(sampleDream.id);

    const delTs = tombstoneService.getDeletionTimestamp(sampleDream.id);
    expect(delTs).not.toBeNull();

    // Restore the dream
    const restored = await dreamService.restoreFromTrash(sampleDream.id);
    expect(restored).toBeDefined();

    // Local tombstone must be removed
    expect(tombstoneService.isDeleted(sampleDream.id)).toBe(false);

    // Dream updatedAt must be >= restoration timestamp to win remote sync merge
    expect(restored!.updatedAt).toBeGreaterThanOrEqual(delTs!);

    // Verify backup export payload includes restored dream and no tombstone for it
    const exportData = await backupService.exportData();
    expect(exportData.dreams.some((d) => d.id === sampleDream.id)).toBe(true);
    expect(exportData.tombstones?.[sampleDream.id]).toBeUndefined();

    // Simulate remote device receiving sync: importData should accept the restored dream
    await tombstoneService.recordDeletion(sampleDream.id, delTs!); // simulate remote had tombstone
    const importResult = await backupService.importData(exportData, 'merge');
    expect(importResult.dreamCount).toBeGreaterThan(0);
    expect(tombstoneService.isDeleted(sampleDream.id)).toBe(false); // tombstone cleared remotely!
  });

  it('Scenario 8: Duplicate prevention on repeated restore calls', async () => {
    await db.dreams.put(sampleDream);
    await dreamService.deleteDream(sampleDream.id);

    // Call restore twice
    const r1 = await dreamService.restoreFromTrash(sampleDream.id);
    const r2 = await dreamService.restoreFromTrash(sampleDream.id);

    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r1?.id).toBe(sampleDream.id);

    // Verify exactly one record in database
    const all = await db.dreams.where('id').equals(sampleDream.id).toArray();
    expect(all).toHaveLength(1);
  });

  it('Scenario 9: Storage resilience against malformed JSON and corrupted records', () => {
    // Malformed JSON
    localStorage.setItem('oneiric_dream_trash', '{bad-json:::corrupt');
    expect(trashService.getTrash()).toEqual([]);

    // Corrupted records (missing dream object or missing ID)
    const corruptedArray = [
      null,
      'string-instead-of-object',
      { dream: null, deletedAt: Date.now() },
      { dream: { id: 123 }, deletedAt: 'bad-date' }, // bad types
      { dream: { id: 'valid-dream', title: 'Resilient Dream' }, deletedAt: Date.now() },
    ];
    localStorage.setItem('oneiric_dream_trash', JSON.stringify(corruptedArray));

    const trash = trashService.getTrash();
    expect(trash).toHaveLength(1);
    expect(trash[0].dream.id).toBe('valid-dream');
  });

  it('Scenario 10: Quota handling preserves trashed dream via memory fallback and pruning', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (key === 'oneiric_dream_trash') {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
    });

    // Move dream to trash when localStorage throws QuotaExceededError
    trashService.moveToTrash(sampleDream);

    // Must still be preserved in memory fallback
    const trash = trashService.getTrash();
    expect(trash).toHaveLength(1);
    expect(trash[0].dream.id).toBe(sampleDream.id);

    // Can still be restored without data loss
    const restored = trashService.restoreDream(sampleDream.id);
    expect(restored).toBeDefined();
    expect(restored?.title).toBe('The Starlit Citadel');

    setItemSpy.mockRestore();
  });

  it('Scenario 11: Full Factory Reset (wipeAllData) clears trash and tombstones', async () => {
    await db.dreams.put(sampleDream);
    await dreamService.deleteDream(sampleDream.id);

    expect(trashService.getTrash()).toHaveLength(1);
    expect(tombstoneService.isDeleted(sampleDream.id)).toBe(true);

    await backupService.wipeAllData();

    expect(trashService.getTrash()).toHaveLength(0);
    expect(tombstoneService.isDeleted(sampleDream.id)).toBe(false);
  });
});

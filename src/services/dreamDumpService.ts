import { db } from '../db/database';
import { DreamDumpNote } from '../types/dreamDump';
import { tombstoneService } from '../utils/tombstones';
import { syncService } from './syncService';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dump-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const dreamDumpService = {
  /**
   * Retrieves all dream dump fragments ordered newest first (by updatedAt)
   */
  async getAllNotes(): Promise<DreamDumpNote[]> {
    const notes = await db.dreamDumps.toArray();
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /**
   * Retrieves a single dream dump note by ID
   */
  async getNoteById(id: string): Promise<DreamDumpNote | undefined> {
    if (!id) return undefined;
    return db.dreamDumps.get(id);
  },

  /**
   * Creates a new dream dump note instantly
   */
  async createNote(content: string = ''): Promise<DreamDumpNote> {
    const now = Date.now();
    const note: DreamDumpNote = {
      id: generateId(),
      content,
      createdAt: now,
      updatedAt: now,
    };

    await db.dreamDumps.add(note);
    syncService.triggerAutoSync();
    return note;
  },

  /**
   * Updates the content of an existing note with an updated timestamp
   */
  async updateNote(id: string, content: string): Promise<DreamDumpNote> {
    const existing = await db.dreamDumps.get(id);
    const now = Date.now();

    if (!existing) {
      // If note doesn't exist yet, create it with this id
      const newNote: DreamDumpNote = {
        id,
        content,
        createdAt: now,
        updatedAt: now,
      };
      await db.dreamDumps.add(newNote);
      syncService.triggerAutoSync();
      return newNote;
    }

    const updatedNote: DreamDumpNote = {
      ...existing,
      content,
      updatedAt: now,
    };

    await db.dreamDumps.put(updatedNote);
    syncService.triggerAutoSync();
    return updatedNote;
  },

  /**
   * Deletes a note and records a tombstone for sync consistency
   */
  async deleteNote(id: string): Promise<void> {
    if (!id) return;
    await db.dreamDumps.delete(id);
    tombstoneService.recordDeletion(id);
    syncService.triggerAutoSync();
  },

  /**
   * Marks a fragment as converted into a full dream entry while preserving the fragment
   */
  async markConverted(id: string, dreamId?: string): Promise<void> {
    const note = await db.dreamDumps.get(id);
    if (!note) return;

    await db.dreamDumps.update(id, {
      isConverted: true,
      convertedToDreamId: dreamId,
      updatedAt: Date.now(),
    });
    syncService.triggerAutoSync();
  },

  /**
   * Prunes empty, untouched notes (excluding any active note ID being written)
   */
  async pruneEmptyNotes(activeNoteId?: string): Promise<number> {
    const all = await db.dreamDumps.toArray();
    const emptyNotes = all.filter(
      (n) => n.id !== activeNoteId && n.content.trim().length === 0
    );

    if (emptyNotes.length > 0) {
      const ids = emptyNotes.map((n) => n.id);
      await db.dreamDumps.bulkDelete(ids);
      tombstoneService.recordDeletions(ids);
    }

    return emptyNotes.length;
  },
};

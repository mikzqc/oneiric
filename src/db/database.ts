import Dexie, { type Table } from 'dexie';
import { DreamEntry } from '../types/dream';
import { TechniqueLog } from '../types/technique';
import { CustomTag } from '../types/backup';
import { DreamSign } from '../types/dreamSign';

export class OneiricDatabase extends Dexie {
  dreams!: Table<DreamEntry, string>;
  techniqueLogs!: Table<TechniqueLog, string>;
  customTags!: Table<CustomTag, string>;
  dreamSigns!: Table<DreamSign, string>;

  constructor() {
    super('OneiricDB');

    // Version 1: Phase 1 baseline schema
    this.version(1).stores({
      dreams: 'id, date, lucidity, createdAt, updatedAt, *tags, *emotions, isSample',
      techniqueLogs: 'id, date, technique, outcome, createdAt, isSample',
      customTags: 'id, name, createdAt',
    });

    // Version 2: Phase 2 Dream Intelligence schema
    this.version(2)
      .stores({
        dreams: 'id, date, lucidity, falseAwakening, createdAt, updatedAt, *tags, *emotions, isSample',
        techniqueLogs: 'id, date, technique, outcome, createdAt, isSample',
        customTags: 'id, name, createdAt',
        dreamSigns: 'id, name, category, status, distinctDreamCount, lastOccurred, isRealityCheckReminder, createdAt, updatedAt, *keywords, isSample',
      })
      .upgrade((tx) => {
        // Safe migration: preserve all Phase 1 records and initialize falseAwakening
        return tx
          .table('dreams')
          .toCollection()
          .modify((dream: Partial<DreamEntry>) => {
            if (dream.falseAwakening === undefined) {
              dream.falseAwakening = false;
            }
          });
      });
  }
}

export const db = new OneiricDatabase();

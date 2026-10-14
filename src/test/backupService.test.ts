import { describe, it, expect, beforeEach } from 'vitest';
import { backupService } from '../services/backupService';
import { dreamService } from '../services/dreamService';
import { db } from '../db/database';

describe('backupService: Export, Validation & Import', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
  });

  it('exports data with correct schema and version', async () => {
    await dreamService.createDream({
      title: 'Aurora Borealis in the Bedroom',
      narrative: 'Green ribbons of light danced across the ceiling.',
      date: '2026-10-14',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'lucid',
      emotions: ['Awe'],
      tags: ['Space'],
    });

    const exportData = await backupService.exportData();
    expect(exportData.version).toBe(2);
    expect(exportData.source).toBe('oneiric');
    expect(exportData.dreams.length).toBe(1);
    expect(exportData.dreams[0].title).toBe('Aurora Borealis in the Bedroom');
  });

  it('validates a correct backup JSON successfully', () => {
    const validJson = JSON.stringify({
      version: 1,
      source: 'oneiric',
      exportedAt: new Date().toISOString(),
      dreams: [
        {
          id: 'test-1',
          title: 'Valid Dream',
          narrative: 'Valid content',
          date: '2026-10-12',
          vividness: 3,
          recallQuality: 'detailed',
          lucidity: 'lucid',
          emotions: ['Wonder'],
          tags: ['Test'],
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      techniqueLogs: [],
    });

    const result = backupService.validateImportData(validJson);
    expect(result.valid).toBe(true);
    expect(result.stats?.dreamCount).toBe(1);
    expect(result.stats?.lucidCount).toBe(1);
  });

  it('rejects invalid JSON string', () => {
    const result = backupService.validateImportData('{ invalid json');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not valid JSON');
  });

  it('rejects backup with wrong source or version', () => {
    const wrongVersion = JSON.stringify({
      version: 99,
      source: 'oneiric',
      dreams: [],
    });
    expect(backupService.validateImportData(wrongVersion).valid).toBe(false);

    const wrongSource = JSON.stringify({
      version: 1,
      source: 'unknown_app',
      dreams: [],
    });
    expect(backupService.validateImportData(wrongSource).valid).toBe(false);
  });

  it('rejects dreams with missing required fields or bad lucidity', () => {
    const badLucidity = JSON.stringify({
      version: 1,
      source: 'oneiric',
      dreams: [
        {
          id: '1',
          title: 'Bad Lucidity',
          narrative: '...',
          date: '2026-10-10',
          lucidity: 'super-lucid-fake',
        },
      ],
    });
    const result = backupService.validateImportData(badLucidity);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid lucidity status');
  });

  it('loads and clears sample data cleanly without affecting real entries', async () => {
    // Add real entry
    const realEntry = await dreamService.createDream({
      title: 'Real Dream',
      narrative: 'This is my real memory',
      date: '2026-10-14',
      vividness: 5,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      emotions: ['Joy'],
      tags: ['Personal'],
      isSample: false,
    });

    // Load sample data
    await backupService.loadSampleData();
    const countAfterLoad = await db.dreams.count();
    expect(countAfterLoad).toBeGreaterThan(1);

    // Clear sample data
    await backupService.clearSampleData();
    const allRemaining = await db.dreams.toArray();
    expect(allRemaining.length).toBe(1);
    expect(allRemaining[0].id).toBe(realEntry.id);
  });

  it('cleanupSamplePreviewOnStartup removes sample entries automatically simulating page refresh', async () => {
    // Real entry
    await dreamService.createDream({
      title: 'Persistent Real Dream',
      narrative: 'Real content that must survive refresh',
      date: '2026-10-14',
      vividness: 4,
      recallQuality: 'detailed',
      lucidity: 'non-lucid',
      emotions: [],
      tags: [],
      isSample: false,
    });

    // Load sample data preview
    await backupService.loadSampleData();
    const countWithSample = await db.dreams.count();
    expect(countWithSample).toBe(6);

    // Simulate page refresh / app startup
    const removedCount = await backupService.cleanupSamplePreviewOnStartup();
    expect(removedCount).toBeGreaterThan(0);

    const remainingDreams = await db.dreams.toArray();
    expect(remainingDreams.length).toBe(1);
    expect(remainingDreams[0].title).toBe('Persistent Real Dream');
  });

  it('exportData excludes temporary sample preview entries', async () => {
    await dreamService.createDream({
      title: 'Real Journal Memory',
      narrative: 'Important real entry',
      date: '2026-10-14',
      vividness: 5,
      recallQuality: 'crystal',
      lucidity: 'lucid',
      emotions: [],
      tags: [],
      isSample: false,
    });

    await backupService.loadSampleData();

    const exported = await backupService.exportData();
    // Only the real dream should be exported!
    expect(exported.dreams.length).toBe(1);
    expect(exported.dreams[0].title).toBe('Real Journal Memory');
    expect(exported.techniqueLogs.length).toBe(0);
  });
});

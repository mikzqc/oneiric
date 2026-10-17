import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { dreamService } from '../services/dreamService';
import {
  dreamSignService,
  clearIgnoredSignNames,
  getIgnoredSignNames,
} from '../services/dreamSignService';
import { correlationService } from '../services/correlationService';
import { backupService } from '../services/backupService';

describe('AI-Vibecoded Dream Sign Removal & Management Suite', () => {
  beforeEach(async () => {
    await db.dreams.clear();
    await db.dreamSigns.clear();
    await db.techniqueLogs.clear();
    await db.customTags.clear();
    clearIgnoredSignNames();
  });

  describe('Scope A: Remove from Dream Sign Library', () => {
    it('deletes a single sign and prevents automatic resurrection in future pattern scans', async () => {
      // 1. Create two distinct dreams containing "flying"
      const d1 = await dreamService.createDream({
        title: 'Flying over mountains',
        narrative: 'I was flying high over snow-covered peaks.',
        date: '2026-10-10',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Joy'],
        tags: ['Flight'],
      });

      const d2 = await dreamService.createDream({
        title: 'Floating over ocean',
        narrative: 'I was flying peacefully above the gentle waves.',
        date: '2026-10-11',
        vividness: 5,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Serenity'],
        tags: ['Flight'],
      });

      // 2. Scan and verify suggestion created
      await dreamSignService.scanAndDetectSigns();
      const detected = await dreamSignService.getAllSigns();
      const flyingSign = detected.find((s) => s.name.toLowerCase().includes('flying'));
      expect(flyingSign).toBeDefined();
      expect(flyingSign!.distinctDreamCount).toBe(2);

      // 3. Delete the sign permanently with default preventRecreation = true
      await dreamSignService.deleteSign(flyingSign!.id, true);

      // Verify sign is removed from database
      const afterDelete = await dreamSignService.getSignById(flyingSign!.id);
      expect(afterDelete).toBeUndefined();

      // Verify sign name is recorded in ignored list
      const ignoredNames = getIgnoredSignNames();
      expect(ignoredNames.some((n) => n.toLowerCase().includes('flying'))).toBe(true);

      // 4. Verify original dream narratives and tags remain 100% intact
      const dream1After = await dreamService.getDreamById(d1.id);
      const dream2After = await dreamService.getDreamById(d2.id);
      expect(dream1After?.narrative).toBe('I was flying high over snow-covered peaks.');
      expect(dream1After?.tags).toEqual(['Flight']);
      expect(dream2After?.narrative).toBe('I was flying peacefully above the gentle waves.');

      // 5. Run pattern scan again — the deleted sign MUST NOT resurrect!
      await dreamSignService.scanAndDetectSigns();
      const afterRescan = await dreamSignService.getAllSigns();
      const resurrected = afterRescan.find((s) => s.name.toLowerCase().includes('flying'));
      expect(resurrected).toBeUndefined();
    });

    it('bulk deletes multiple signs and reports succeeded operations', async () => {
      const s1 = await dreamSignService.createSign({
        name: 'Sign Alpha',
        category: 'object',
        keywords: ['alpha'],
        status: 'confirmed',
        linkedDreamIds: [],
        distinctDreamCount: 0,
      });

      const s2 = await dreamSignService.createSign({
        name: 'Sign Beta',
        category: 'location',
        keywords: ['beta'],
        status: 'suggested',
        linkedDreamIds: [],
        distinctDreamCount: 0,
      });

      const res = await dreamSignService.deleteMultipleSigns([s1.id, s2.id], true);
      expect(res.succeeded).toHaveLength(2);
      expect(res.failed).toHaveLength(0);

      const all = await dreamSignService.getAllSigns();
      expect(all.find((s) => s.id === s1.id)).toBeUndefined();
      expect(all.find((s) => s.id === s2.id)).toBeUndefined();
    });
  });

  describe('Scope B: Remove a Sign from a Specific Dream (Unlink)', () => {
    it('unlinks a sign from one specific dream while preserving associations to other dreams and leaving narratives untouched', async () => {
      // 1. Create two dreams mentioning clocks
      const d1 = await dreamService.createDream({
        title: 'Meeting with old grandfather clock',
        narrative: 'There was an antique clock in the corner of the room that ticked loudly.',
        date: '2026-10-10',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Curiosity'],
        tags: ['Room'],
      });

      const d2 = await dreamService.createDream({
        title: 'Broken watch tower',
        narrative: 'The clock tower read 12:00 and refused to move.',
        date: '2026-10-12',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Wonder'],
        tags: ['Tower'],
      });

      // 2. Scan to create clock sign
      await dreamSignService.scanAndDetectSigns();
      let clockSign = (await dreamSignService.getAllSigns()).find((s) =>
        s.name.toLowerCase().includes('clock')
      );
      expect(clockSign).toBeDefined();
      expect(clockSign!.distinctDreamCount).toBe(2);
      expect(clockSign!.linkedDreamIds).toContain(d1.id);
      expect(clockSign!.linkedDreamIds).toContain(d2.id);

      // 3. User unlinks clockSign from d1 ONLY
      const updatedSign = await dreamSignService.unlinkSignFromDream(clockSign!.id, d1.id);

      // Check sign state: d1 is excluded and unlinked, d2 remains linked
      expect(updatedSign.excludedDreamIds).toContain(d1.id);
      expect(updatedSign.linkedDreamIds).not.toContain(d1.id);
      expect(updatedSign.linkedDreamIds).toContain(d2.id);
      expect(updatedSign.distinctDreamCount).toBe(1);

      // 4. Verify d1 narrative is COMPLETELY untouched
      const d1After = await dreamService.getDreamById(d1.id);
      expect(d1After!.narrative).toBe(
        'There was an antique clock in the corner of the room that ticked loudly.'
      );
      expect(d1After!.title).toBe('Meeting with old grandfather clock');

      // 5. Run automatic pattern detection scan again
      // The scanner MUST respect sign.excludedDreamIds and NOT re-link d1
      await dreamSignService.scanAndDetectSigns();
      const clockSignAfterScan = await dreamSignService.getSignById(clockSign!.id);
      expect(clockSignAfterScan!.linkedDreamIds).not.toContain(d1.id);
      expect(clockSignAfterScan!.linkedDreamIds).toContain(d2.id);
      expect(clockSignAfterScan!.distinctDreamCount).toBe(1);

      // 6. Test correlation service: dreamMatchesSign for d1 must be false
      const matchesD1 = correlationService.dreamMatchesSign(d1After!, clockSignAfterScan!);
      const matchesD2 = correlationService.dreamMatchesSign(d2, clockSignAfterScan!);
      expect(matchesD1).toBe(false);
      expect(matchesD2).toBe(true);
    });

    it('allows re-linking a previously unlinked dream', async () => {
      const d1 = await dreamService.createDream({
        title: 'Mirrors dream',
        narrative: 'A large mirror covered the wall.',
        date: '2026-10-10',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: [],
        tags: [],
      });

      const sign = await dreamSignService.createSign({
        name: 'Mirror Test',
        category: 'object',
        keywords: ['mirror'],
        status: 'confirmed',
        linkedDreamIds: [d1.id],
        distinctDreamCount: 1,
      });

      // Unlink
      await dreamSignService.unlinkSignFromDream(sign.id, d1.id);
      let loaded = await dreamSignService.getSignById(sign.id);
      expect(loaded?.linkedDreamIds).toHaveLength(0);
      expect(loaded?.excludedDreamIds).toContain(d1.id);

      // Re-link
      await dreamSignService.linkSignToDream(sign.id, d1.id);
      loaded = await dreamSignService.getSignById(sign.id);
      expect(loaded?.linkedDreamIds).toContain(d1.id);
      expect(loaded?.excludedDreamIds).not.toContain(d1.id);
      expect(loaded?.distinctDreamCount).toBe(1);
    });
  });

  describe('Dismissal and Restoration Flow', () => {
    it('dismisses a sign and allows restoring it back to confirmed status', async () => {
      const sign = await dreamSignService.createSign({
        name: 'Teeth Falling Out',
        category: 'action',
        keywords: ['teeth'],
        status: 'confirmed',
        linkedDreamIds: [],
        distinctDreamCount: 0,
      });

      // Dismiss sign
      await dreamSignService.dismissSign(sign.id);
      let current = await dreamSignService.getSignById(sign.id);
      expect(current?.status).toBe('dismissed');

      // Dismissed signs list contains it
      const dismissedList = await dreamSignService.getDismissedSigns();
      expect(dismissedList.some((s) => s.id === sign.id)).toBe(true);

      // Restore sign
      await dreamSignService.restoreSign(sign.id, 'confirmed');
      current = await dreamSignService.getSignById(sign.id);
      expect(current?.status).toBe('confirmed');
    });

    it('bulk dismisses and bulk restores multiple signs', async () => {
      const s1 = await dreamSignService.createSign({
        name: 'Bulk Sign 1',
        category: 'anomaly',
        keywords: ['s1'],
        status: 'confirmed',
        linkedDreamIds: [],
        distinctDreamCount: 0,
      });
      const s2 = await dreamSignService.createSign({
        name: 'Bulk Sign 2',
        category: 'location',
        keywords: ['s2'],
        status: 'suggested',
        linkedDreamIds: [],
        distinctDreamCount: 0,
      });

      await dreamSignService.dismissMultipleSigns([s1.id, s2.id]);
      let dismissed = await dreamSignService.getDismissedSigns();
      expect(dismissed).toHaveLength(2);

      await dreamSignService.restoreMultipleSigns([s1.id, s2.id], 'confirmed');
      dismissed = await dreamSignService.getDismissedSigns();
      expect(dismissed).toHaveLength(0);

      const confirmed = await dreamSignService.getConfirmedSigns();
      expect(confirmed.some((s) => s.id === s1.id)).toBe(true);
      expect(confirmed.some((s) => s.id === s2.id)).toBe(true);
    });

    it('excludes dismissed signs from correlation analysis reports', async () => {
      const d1 = await dreamService.createDream({
        title: 'Elevator falling',
        narrative: 'An elevator plunging down.',
        date: '2026-10-01',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Fear'],
        tags: [],
      });
      const d2 = await dreamService.createDream({
        title: 'Second elevator',
        narrative: 'Elevator was soaring.',
        date: '2026-10-02',
        vividness: 5,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Joy'],
        tags: [],
      });

      const sign = await dreamSignService.createSign({
        name: 'Elevator',
        category: 'object',
        keywords: ['elevator'],
        status: 'dismissed', // Dismissed by user
        linkedDreamIds: [d1.id, d2.id],
        distinctDreamCount: 2,
      });

      const report = await correlationService.computeCorrelations({
        timeRange: 'all',
        lucidityFilter: 'all',
        signStatus: 'all_active',
        minOccurrences: 2,
      });

      // Dismissed sign should not be included in active correlation findings
      const hasElevator = report.signLucidityCorrelations.some((c) => c.signId === sign.id);
      expect(hasElevator).toBe(false);
    });
  });

  describe('Backup, Export & Schema Compatibility', () => {
    it('exports and round-trips signs with excludedDreamIds correctly', async () => {
      await dreamService.createDream({
        title: 'Test Dream',
        narrative: 'A test narrative.',
        date: '2026-10-10',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: [],
        tags: [],
      });

      const sign = await dreamSignService.createSign({
        name: 'Excluded Test',
        category: 'other',
        keywords: ['test'],
        status: 'confirmed',
        linkedDreamIds: [],
        distinctDreamCount: 0,
      });

      await dreamSignService.unlinkSignFromDream(sign.id, 'dream-sample-id-99');

      const exportData = await backupService.exportData();
      expect(exportData.version).toBe(2);
      expect(exportData.dreamSigns).toBeDefined();

      const exportedSign = exportData.dreamSigns?.find((s) => s.id === sign.id);
      expect(exportedSign?.excludedDreamIds).toContain('dream-sample-id-99');
    });
  });
});

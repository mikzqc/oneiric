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

    it('deletes a single sign without preventing re-detection by default, allowing it to re-appear on scan', async () => {
      // 1. Create two dreams containing "teleport" ("Impossible Physics")
      await dreamService.createDream({
        title: 'Teleporting in hallway',
        narrative: 'I was suddenly teleporting through the long hallway.',
        date: '2026-10-15',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Wonder'],
        tags: [],
      });

      await dreamService.createDream({
        title: 'Floating and teleporting',
        narrative: 'I began floating weightlessly and then started teleporting across the sky.',
        date: '2026-10-16',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'lucid',
        emotions: ['Joy'],
        tags: [],
      });

      // 2. Scan to detect sign
      await dreamSignService.scanAndDetectSigns();
      const detected = await dreamSignService.getAllSigns();
      const physicsSign = detected.find((s) => s.name.toLowerCase().includes('impossible physics'));
      expect(physicsSign).toBeDefined();

      // 3. User deletes the sign with default settings (preventRecreation = false)
      await dreamSignService.deleteSign(physicsSign!.id);

      // Verify sign is removed from database
      expect(await dreamSignService.getSignById(physicsSign!.id)).toBeUndefined();

      // Verify sign name is NOT recorded in ignored list
      expect(getIgnoredSignNames().some((n) => n.toLowerCase().includes('impossible physics'))).toBe(false);

      // 4. Run automatic pattern detection scan again — sign SHOULD re-appear!
      await dreamSignService.scanAndDetectSigns();
      const afterRescan = await dreamSignService.getAllSigns();
      const redetected = afterRescan.find((s) => s.name.toLowerCase().includes('impossible physics'));
      expect(redetected).toBeDefined();
      expect(redetected!.distinctDreamCount).toBe(2);
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

  describe('Dream Signs Deduplication & Automatic Consolidation', () => {
    it('consolidates duplicate signs with the same name and merges dreams, status, and keywords', async () => {
      // Replicate the exact issue from the user screenshot:
      // Two "Family Members" entries with different IDs and different linked dreams
      await db.dreamSigns.add({
        id: 'dup-fam-1',
        name: 'Family Members',
        category: 'person',
        keywords: ['mother', 'father', 'mom', 'dad'],
        status: 'confirmed',
        isRealityCheckReminder: true,
        linkedDreamIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
        distinctDreamCount: 8,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await db.dreamSigns.add({
        id: 'dup-fam-2',
        name: 'Family Members',
        category: 'person',
        keywords: ['brother', 'sister', 'mom'],
        status: 'suggested',
        isRealityCheckReminder: false,
        linkedDreamIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd9'],
        distinctDreamCount: 8,
        createdAt: 2000,
        updatedAt: 2000,
      });

      // Three "Elevators & Escalators" entries with different IDs
      await db.dreamSigns.add({
        id: 'dup-elev-1',
        name: 'Elevators & Escalators',
        category: 'object',
        keywords: ['elevator'],
        status: 'suggested',
        linkedDreamIds: ['e1', 'e2'],
        distinctDreamCount: 2,
        createdAt: 1000,
        updatedAt: 1000,
      });

      await db.dreamSigns.add({
        id: 'dup-elev-2',
        name: 'Elevators & Escalators',
        category: 'object',
        keywords: ['escalator'],
        status: 'suggested',
        linkedDreamIds: ['e2', 'e3'],
        distinctDreamCount: 2,
        createdAt: 2000,
        updatedAt: 2000,
      });

      await db.dreamSigns.add({
        id: 'dup-elev-3',
        name: 'Elevators & Escalators',
        category: 'object',
        keywords: ['falling elevator'],
        status: 'confirmed',
        linkedDreamIds: ['e3', 'e4'],
        distinctDreamCount: 2,
        createdAt: 3000,
        updatedAt: 3000,
      });

      expect(await db.dreamSigns.count()).toBe(5);

      // getAllSigns triggers consolidation automatically
      const signs = await dreamSignService.getAllSigns();
      expect(signs).toHaveLength(2);
      expect(await db.dreamSigns.count()).toBe(2);

      // Verify "Family Members" consolidation
      const familySign = signs.find((s) => s.name === 'Family Members');
      expect(familySign).toBeDefined();
      expect(familySign?.status).toBe('confirmed');
      expect(familySign?.isRealityCheckReminder).toBe(true);
      // Keywords merged
      expect(familySign?.keywords).toContain('brother');
      expect(familySign?.keywords).toContain('sister');
      expect(familySign?.keywords).toContain('mother');
      // Unique linked dreams merged: d1-d9 = 9 dreams
      expect(familySign?.linkedDreamIds).toHaveLength(9);
      expect(familySign?.distinctDreamCount).toBe(9);

      // Verify "Elevators & Escalators" consolidation
      const elevSign = signs.find((s) => s.name === 'Elevators & Escalators');
      expect(elevSign).toBeDefined();
      expect(elevSign?.status).toBe('confirmed'); // took confirmed over suggested
      expect(elevSign?.keywords).toContain('elevator');
      expect(elevSign?.keywords).toContain('escalator');
      expect(elevSign?.keywords).toContain('falling elevator');
      // Unique dreams: e1, e2, e3, e4 = 4 dreams
      expect(elevSign?.linkedDreamIds).toHaveLength(4);
      expect(elevSign?.distinctDreamCount).toBe(4);
    });

    it('prevents createSign from creating duplicate records when a sign with the same name exists', async () => {
      const first = await dreamSignService.createSign({
        name: 'Custom Astral Mirror',
        category: 'object',
        keywords: ['mirror'],
        status: 'suggested',
        linkedDreamIds: ['d1'],
        distinctDreamCount: 1,
      });

      // Calling createSign with the same name but confirmed status and extra keyword
      const second = await dreamSignService.createSign({
        name: 'Custom Astral Mirror ',
        category: 'object',
        keywords: ['glass', 'silver reflection'],
        status: 'confirmed',
        linkedDreamIds: ['d2'],
        distinctDreamCount: 1,
      });

      expect(second.id).toBe(first.id);
      expect(await db.dreamSigns.count()).toBe(1);

      const saved = await dreamSignService.getSignById(first.id);
      expect(saved?.status).toBe('confirmed');
      expect(saved?.keywords).toEqual(expect.arrayContaining(['mirror', 'glass', 'silver reflection']));
      expect(saved?.linkedDreamIds).toEqual(expect.arrayContaining(['d1', 'd2']));
      expect(saved?.distinctDreamCount).toBe(2);
    });

    it('merges signs by name during backupService.importData in merge mode without duplicating', async () => {
      await dreamSignService.createSign({
        name: 'Flying / Levitation',
        category: 'anomaly',
        keywords: ['flight'],
        status: 'confirmed',
        linkedDreamIds: ['d-local-1'],
        distinctDreamCount: 1,
      });

      // Import backup from another device with a different ID for the same sign
      const incomingBackup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        source: 'oneiric',
        dreams: [],
        techniqueLogs: [],
        customTags: [],
        dreamSigns: [
          {
            id: 'sign-remote-999',
            name: 'Flying / Levitation',
            category: 'anomaly',
            keywords: ['levitate', 'hovering'],
            status: 'confirmed',
            linkedDreamIds: ['d-remote-1'],
            distinctDreamCount: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      await backupService.importData(incomingBackup, 'merge');

      // Must remain exactly 1 sign in the database!
      const allSigns = await dreamSignService.getAllSigns();
      expect(allSigns).toHaveLength(1);
      expect(allSigns[0].name).toBe('Flying / Levitation');
      expect(allSigns[0].keywords).toEqual(expect.arrayContaining(['flight', 'levitate', 'hovering']));
      expect(allSigns[0].linkedDreamIds).toEqual(expect.arrayContaining(['d-local-1', 'd-remote-1']));
    });
  });

  describe('Keyword Analysis Quality & Strict Written-Content Matching', () => {
    it('analyzes ONLY what is written in the dream narrative/scenes, ignoring tags and titles', async () => {
      // Replicate the user's exact reported scenario:
      // Dream 1 has "ghost demon child" written in narrative, with tags ['#Mansion', '#Ghost']
      const d1 = await dreamService.createDream({
        title: 'Mansion Syllabus',
        narrative: 'I was in a creepy ass mansion with this small ghost demon child hunting me. And I was with my sister.',
        date: '2026-09-27',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Fear'],
        tags: ['Mansion', 'Ghost'],
      });

      // Dream 2 has tags ['#Native House', '#Mansion', '#Ghost'], but the written narrative NEVER mentions ghosts!
      const d2 = await dreamService.createDream({
        title: '2 dreams first time remembering both',
        narrative: 'So I was in my mom\'s native house, and I was with my sister, and she wanted my other iPad. Apparently I had 2.',
        date: '2026-09-27',
        vividness: 4,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: ['Confusion'],
        tags: ['Native House', 'Mansion', 'Ghost', 'Teleportation'],
      });

      await dreamSignService.scanAndDetectSigns();

      const suggested = await dreamSignService.getSuggestedSigns();

      // 1. "Deceased Relatives" MUST NEVER be suggested!
      const deceasedRel = suggested.find((s) => s.name.toLowerCase().includes('deceased relatives'));
      expect(deceasedRel).toBeUndefined();

      // 2. "Ghosts & Spirits" must NOT be suggested because "ghost" ONLY appeared in 1 dream's written text (Dream 1),
      // even though Dream 2 had tag '#Ghost'!
      const ghostSign = suggested.find((s) => s.name.toLowerCase().includes('ghost'));
      expect(ghostSign).toBeUndefined();

      // 3. "Family Members" WAS written in both dreams ("sister" in Dream 1, "sister" & "mom" in Dream 2),
      // so Family Members MUST be suggested cleanly!
      const familySign = suggested.find((s) => s.name.toLowerCase().includes('family members'));
      expect(familySign).toBeDefined();
      expect(familySign?.distinctDreamCount).toBe(2);
      expect(familySign?.linkedDreamIds).toEqual(expect.arrayContaining([d1.id, d2.id]));
    });

    it('purges legacy invalid suggestions when their distinct written dream count drops to 0', async () => {
      // User has a legacy suggested sign in database that only matched due to tag pollution
      await db.dreamSigns.add({
        id: 'legacy-bad-sign',
        name: 'Deceased Relatives',
        category: 'person',
        keywords: ['grandfather', 'grandmother', 'passed away', 'ancestor', 'ghost'],
        status: 'suggested',
        linkedDreamIds: ['d1', 'd2'],
        distinctDreamCount: 2,
        createdAt: 1000,
        updatedAt: 1000,
      });

      // Dream 1 and 2 mention nothing about deceased relatives
      await dreamService.createDream({
        title: 'Dream One',
        narrative: 'I walked down the sunny street buying apples.',
        date: '2026-10-01',
        vividness: 3,
        recallQuality: 'detailed',
        lucidity: 'non-lucid',
        emotions: [],
        tags: [],
      });

      await dreamSignService.scanAndDetectSigns();

      // The invalid suggested sign must have been deleted because written matches === 0!
      const remainingSign = await dreamSignService.getSignById('legacy-bad-sign');
      expect(remainingSign).toBeUndefined();
    });
  });
});

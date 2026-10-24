import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  wakeTimeService,
  DEFAULT_WAKE_TIME,
  WAKE_TIME_STORAGE_KEY,
  getBrowserTimeZone,
  isValidTimeZone,
  fetchIpTimeZone,
} from '../services/wakeTimeService';
import { db } from '../db/database';
import { DreamEntry } from '../types/dream';

describe('wakeTimeService: Automatic Time Zone & Wake-Up Time Detection', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.dreams.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Time Zone Utilities & Browser Detection', () => {
    it('validates IANA time zone strings accurately', () => {
      expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
      expect(isValidTimeZone('America/New_York')).toBe(true);
      expect(isValidTimeZone('Europe/London')).toBe(true);
      expect(isValidTimeZone('UTC')).toBe(true);

      expect(isValidTimeZone('')).toBe(false);
      expect(isValidTimeZone('Invalid/Not_A_Timezone')).toBe(false);
      expect(isValidTimeZone(null)).toBe(false);
      expect(isValidTimeZone(undefined)).toBe(false);
    });

    it('resolves the browser time zone from Intl.DateTimeFormat', () => {
      const tz = getBrowserTimeZone();
      expect(typeof tz).toBe('string');
      expect(isValidTimeZone(tz)).toBe(true);
    });
  });

  describe('2. Automatic Initialization on First Run', () => {
    it('automatically initializes config with detected time zone and sensible default wake-up time (07:00)', () => {
      expect(localStorage.getItem(WAKE_TIME_STORAGE_KEY)).toBeNull();

      const config = wakeTimeService.getWakeTimeConfig();

      expect(config.wakeTime).toBe(DEFAULT_WAKE_TIME);
      expect(config.isManualOverride).toBe(false);
      expect(config.source).toBe('auto-detected');
      expect(isValidTimeZone(config.timeZone)).toBe(true);
      expect(config.lastDetectedAt).toBeGreaterThan(0);

      // Verifies it was stored in localStorage
      const storedRaw = localStorage.getItem(WAKE_TIME_STORAGE_KEY);
      expect(storedRaw).not.toBeNull();
      const parsed = JSON.parse(storedRaw!);
      expect(parsed.wakeTime).toBe('07:00');
      expect(parsed.isManualOverride).toBe(false);
    });

    it('distinguishes detected time zone from estimated wake-up time', () => {
      const config = wakeTimeService.getWakeTimeConfig();

      // Time zone is a geographic clock descriptor (e.g. Asia/Kolkata)
      expect(config.timeZone).toMatch(/^[A-Za-z_]+(\/[A-Za-z_]+)*$/);
      // Wake-up time is a 24-hour clock time (e.g. 07:00), not the current system time
      expect(config.wakeTime).toBe('07:00');
    });
  });

  describe('3. IP Geolocation Fallback & Network Resilience', () => {
    it('fetches and resolves time zone from IP geolocation service when available', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timezone: 'Europe/Berlin',
          city: 'Berlin',
          country_name: 'Germany',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const ipResult = await fetchIpTimeZone(1000);
      expect(ipResult).not.toBeNull();
      expect(ipResult?.timeZone).toBe('Europe/Berlin');
    });

    it('handles network failure, timeout, or offline state gracefully without crashing', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
      vi.stubGlobal('fetch', mockFetch);

      const ipResult = await fetchIpTimeZone(500);
      expect(ipResult).toBeNull();

      // Service refreshTimeZone falls back safely to browser time zone
      const refreshed = await wakeTimeService.refreshTimeZone(true);
      expect(isValidTimeZone(refreshed.timeZone)).toBe(true);
      expect(refreshed.wakeTime).toBe(DEFAULT_WAKE_TIME);
    });

    it('respects cache TTL and avoids redundant network calls within 24 hours', async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      // Initialize with fresh timestamp
      const initial = wakeTimeService.getWakeTimeConfig();
      expect(initial.lastDetectedAt).toBeGreaterThan(Date.now() - 5000);

      // Refresh without forcing
      await wakeTimeService.refreshTimeZone(false);

      // fetch should NOT have been called because cache is fresh
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('4. Manual Overrides & Non-Destructive Persistence', () => {
    it('saves user manual edits and sets isManualOverride to true', () => {
      const updated = wakeTimeService.setManualWakeTime('06:30');

      expect(updated.wakeTime).toBe('06:30');
      expect(updated.isManualOverride).toBe(true);
      expect(updated.source).toBe('manual');

      // Verify persistence across reload simulation
      const reloaded = wakeTimeService.getWakeTimeConfig();
      expect(reloaded.wakeTime).toBe('06:30');
      expect(reloaded.isManualOverride).toBe(true);
      expect(reloaded.source).toBe('manual');
    });

    it('never overwrites a manual override when refreshing time zone or reloading', async () => {
      // User sets custom wake time
      wakeTimeService.setManualWakeTime('05:45');

      // Mock IP detection returning a new time zone (e.g. user traveled to Tokyo)
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timezone: 'Asia/Tokyo',
          city: 'Tokyo',
          country_name: 'Japan',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Force refresh
      const refreshed = await wakeTimeService.refreshTimeZone(true);

      // Time zone updated to Tokyo, but manual wake time strictly preserved at 05:45!
      expect(refreshed.timeZone).toBe('Asia/Tokyo');
      expect(refreshed.wakeTime).toBe('05:45');
      expect(refreshed.isManualOverride).toBe(true);
      expect(refreshed.source).toBe('manual');

      // Verify persisted state
      const persisted = wakeTimeService.getWakeTimeConfig();
      expect(persisted.wakeTime).toBe('05:45');
      expect(persisted.timeZone).toBe('Asia/Tokyo');
    });

    it('updates time zone for automatic users (isManualOverride = false) when location changes', async () => {
      // User is on auto default (07:00)
      const initial = wakeTimeService.getWakeTimeConfig();
      expect(initial.isManualOverride).toBe(false);

      // Traveling to London
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timezone: 'Europe/London',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const refreshed = await wakeTimeService.refreshTimeZone(true);
      expect(refreshed.timeZone).toBe('Europe/London');
      expect(refreshed.wakeTime).toBe('07:00');
      expect(refreshed.isManualOverride).toBe(false);
      expect(refreshed.source).toBe('auto-detected');
    });

    it('allows resetting manual override back to auto-detected default', async () => {
      wakeTimeService.setManualWakeTime('09:00');
      expect(wakeTimeService.getWakeTimeConfig().isManualOverride).toBe(true);

      const reset = await wakeTimeService.resetToAuto();
      expect(reset.isManualOverride).toBe(false);
      expect(reset.wakeTime).toBe(DEFAULT_WAKE_TIME);
      expect(reset.source).toBe('auto-detected');
    });
  });

  describe('5. Dream History Pattern Detection', () => {
    it('returns manual override wake-up time if configured', async () => {
      wakeTimeService.setManualWakeTime('06:15');
      const suggested = await wakeTimeService.getSuggestedWakeTime();
      expect(suggested).toBe('06:15');
    });

    it('derives most frequent wake-up time from recent dreams when no manual override exists', async () => {
      // Create dreams with consistent wake-up time '06:45'
      const sampleDreams: Partial<DreamEntry>[] = [
        {
          id: 'dream-1',
          title: 'Morning 1',
          narrative: 'Dream 1',
          date: '2026-10-21',
          wakeUpTime: '06:45',
          createdAt: 1000,
          updatedAt: 1000,
          isSample: false,
        },
        {
          id: 'dream-2',
          title: 'Morning 2',
          narrative: 'Dream 2',
          date: '2026-10-22',
          wakeUpTime: '06:45',
          createdAt: 2000,
          updatedAt: 2000,
          isSample: false,
        },
        {
          id: 'dream-3',
          title: 'Morning 3',
          narrative: 'Dream 3',
          date: '2026-10-23',
          wakeUpTime: '08:00',
          createdAt: 3000,
          updatedAt: 3000,
          isSample: false,
        },
      ];

      for (const d of sampleDreams) {
        await db.dreams.add(d as DreamEntry);
      }

      const suggested = await wakeTimeService.getSuggestedWakeTime();
      expect(suggested).toBe('06:45');
    });

    it('falls back to default wake-up time (07:00) when no history exists', async () => {
      const suggested = await wakeTimeService.getSuggestedWakeTime();
      expect(suggested).toBe(DEFAULT_WAKE_TIME);
    });
  });
});

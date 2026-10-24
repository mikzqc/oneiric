import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  wakeTimeService,
  WAKE_TIME_STORAGE_KEY,
  getBrowserTimeZone,
  isValidTimeZone,
  fetchIpTimeZone,
  getCurrentTimeInTimeZone,
} from '../services/wakeTimeService';

describe('wakeTimeService: Current Local Clock Time & Time Zone Initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Time Zone Utilities & Clock Formatting', () => {
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

    it('computes actual clock time in specified time zone correctly without hardcoded hours', () => {
      // 2026-10-24 08:30:00 UTC
      const fixedUtcDate = new Date('2026-10-24T08:30:00Z');

      // UTC should be 08:30
      expect(getCurrentTimeInTimeZone('UTC', fixedUtcDate)).toBe('08:30');

      // Asia/Kolkata is UTC+5:30 -> 14:00
      expect(getCurrentTimeInTimeZone('Asia/Kolkata', fixedUtcDate)).toBe('14:00');

      // America/New_York is UTC-4 in October (EDT) -> 04:30
      expect(getCurrentTimeInTimeZone('America/New_York', fixedUtcDate)).toBe('04:30');

      // Europe/Berlin is UTC+2 in October (CEST) -> 10:30
      expect(getCurrentTimeInTimeZone('Europe/Berlin', fixedUtcDate)).toBe('10:30');
    });

    it('always formats hours and minutes as 2-digit zero-padded strings', () => {
      // 2026-10-24 03:05:00 UTC
      const earlyMorning = new Date('2026-10-24T03:05:00Z');
      const formatted = getCurrentTimeInTimeZone('UTC', earlyMorning);
      expect(formatted).toBe('03:05');
      expect(formatted).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    });
  });

  describe('2. Automatic Initialization Using Current Time (No 07:00 Default)', () => {
    it('initializes the wake-up time field with the actual current local clock time, not a hardcoded 07:00 default', () => {
      expect(localStorage.getItem(WAKE_TIME_STORAGE_KEY)).toBeNull();

      // Freeze time at 09:42:00
      const testDate = new Date('2026-10-24T09:42:00Z');
      vi.setSystemTime(testDate);

      const config = wakeTimeService.getWakeTimeConfig();

      // Expected current time in browser timezone
      const expectedCurrentTime = getCurrentTimeInTimeZone(config.timeZone, testDate);

      expect(config.wakeTime).toBe(expectedCurrentTime);
      expect(config.wakeTime).not.toBe('07:00'); // NOT hardcoded to 07:00
      expect(config.isManualOverride).toBe(false);
      expect(config.source).toBe('current-time');
      expect(isValidTimeZone(config.timeZone)).toBe(true);
      expect(config.lastDetectedAt).toBeGreaterThan(0);
    });

    it('dynamically reflects changing current time when user has not manually set a preference', () => {
      // At 06:15
      vi.setSystemTime(new Date('2026-10-24T06:15:00Z'));
      const timeAt615 = wakeTimeService.getInitialWakeTime();

      // Move forward to 10:45
      vi.setSystemTime(new Date('2026-10-24T10:45:00Z'));
      const timeAt1045 = wakeTimeService.getInitialWakeTime();

      expect(timeAt615).not.toBe(timeAt1045);
      expect(timeAt615).toBe(getCurrentTimeInTimeZone(undefined, new Date('2026-10-24T06:15:00Z')));
      expect(timeAt1045).toBe(getCurrentTimeInTimeZone(undefined, new Date('2026-10-24T10:45:00Z')));
    });

    it('distinguishes detected time zone from current clock time', () => {
      const config = wakeTimeService.getWakeTimeConfig();

      // Time zone is a geographic clock descriptor (e.g. Asia/Kolkata)
      expect(config.timeZone).toMatch(/^[A-Za-z_]+(\/[A-Za-z_]+)*$/);
      // Wake-up time is a 24-hour clock time (e.g. 18:20)
      expect(config.wakeTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    });
  });

  describe('3. IP Geolocation Fallback & Network Resilience', () => {
    it('fetches and resolves time zone from IP geolocation service when available', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timezone: 'Europe/Paris',
          city: 'Paris',
          country_name: 'France',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const ipResult = await fetchIpTimeZone(1000);
      expect(ipResult).not.toBeNull();
      expect(ipResult?.timeZone).toBe('Europe/Paris');
    });

    it('handles network failure, timeout, or offline state gracefully without crashing', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
      vi.stubGlobal('fetch', mockFetch);

      const ipResult = await fetchIpTimeZone(500);
      expect(ipResult).toBeNull();

      // Service refreshTimeZone falls back safely to browser time zone and current time
      const refreshed = await wakeTimeService.refreshTimeZone(true);
      expect(isValidTimeZone(refreshed.timeZone)).toBe(true);
      expect(refreshed.wakeTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
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
    it('saves user manual edits, sets isManualOverride to true, and preserves across reloads', () => {
      // User explicitly sets their wake-up time to 06:15
      const updated = wakeTimeService.setManualWakeTime('06:15');

      expect(updated.wakeTime).toBe('06:15');
      expect(updated.isManualOverride).toBe(true);
      expect(updated.source).toBe('manual');

      // Advance clock to a completely different hour (e.g. 14:00)
      vi.setSystemTime(new Date('2026-10-24T14:00:00Z'));

      // Verify persistence across reload simulation: manual override must NOT be overwritten by clock
      const reloaded = wakeTimeService.getWakeTimeConfig();
      expect(reloaded.wakeTime).toBe('06:15');
      expect(reloaded.isManualOverride).toBe(true);
      expect(reloaded.source).toBe('manual');
    });

    it('never overwrites a manual override when refreshing time zone or location changes', async () => {
      // User sets custom wake time
      wakeTimeService.setManualWakeTime('05:30');

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

      // Time zone updated to Tokyo, but manual wake time strictly preserved at 05:30!
      expect(refreshed.timeZone).toBe('Asia/Tokyo');
      expect(refreshed.wakeTime).toBe('05:30');
      expect(refreshed.isManualOverride).toBe(true);
      expect(refreshed.source).toBe('manual');

      // Verify persisted state
      const persisted = wakeTimeService.getWakeTimeConfig();
      expect(persisted.wakeTime).toBe('05:30');
      expect(persisted.timeZone).toBe('Asia/Tokyo');
    });

    it('updates current local time for automatic users (isManualOverride = false) when location changes', async () => {
      // Freeze at 12:00:00 UTC
      const fixedDate = new Date('2026-10-24T12:00:00Z');
      vi.setSystemTime(fixedDate);

      // User travels to London (UTC)
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timezone: 'UTC',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const refreshed = await wakeTimeService.refreshTimeZone(true);
      expect(refreshed.timeZone).toBe('UTC');
      expect(refreshed.wakeTime).toBe('12:00'); // 12:00 UTC
      expect(refreshed.isManualOverride).toBe(false);
      expect(refreshed.source).toBe('current-time');
    });

    it('allows resetting manual override back to automatic current clock time', async () => {
      // User sets manual override
      wakeTimeService.setManualWakeTime('04:00');
      expect(wakeTimeService.getWakeTimeConfig().isManualOverride).toBe(true);

      // Advance clock to 08:22
      const fixedDate = new Date('2026-10-24T08:22:00Z');
      vi.setSystemTime(fixedDate);

      const reset = await wakeTimeService.resetToAuto();
      expect(reset.isManualOverride).toBe(false);
      expect(reset.wakeTime).toBe(getCurrentTimeInTimeZone(reset.timeZone, fixedDate));
      expect(reset.source).toBe('current-time');
    });
  });
});

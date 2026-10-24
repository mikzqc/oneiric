import { db } from '../db/database';

export interface WakeTimeConfig {
  wakeTime: string; // HH:mm format, e.g. "07:00"
  timeZone: string; // IANA identifier, e.g. "Asia/Kolkata", "America/New_York"
  isManualOverride: boolean; // true if user explicitly entered or modified their wake-up time
  source: 'auto-detected' | 'manual' | 'default';
  lastDetectedAt: number; // timestamp in ms
  city?: string;
  country?: string;
}

export const DEFAULT_WAKE_TIME = '07:00';
export const WAKE_TIME_STORAGE_KEY = 'oneiric_wake_time_config';
export const WAKE_TIME_CHANGED_EVENT = 'oneiric:wake-time-changed';
export const TZ_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Validates whether a given string is a valid IANA time zone identifier
 */
export function isValidTimeZone(tz?: string | null): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves local IANA time zone from the browser/OS environment
 */
export function getBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidTimeZone(tz)) {
      return tz;
    }
  } catch {
    // ignore
  }
  return 'UTC';
}

/**
 * Attempts to detect approximate time zone from IP geolocation service.
 * Fails safely and silently if network is offline, timed out, or blocked.
 */
export async function fetchIpTimeZone(
  timeoutMs = 3000
): Promise<{ timeZone: string; city?: string; country?: string } | null> {
  if (typeof fetch === 'undefined') return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Primary: worldtimeapi.org (HTTPS, CORS-enabled, no authentication key required)
    const res = await fetch('https://worldtimeapi.org/api/ip', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.timezone === 'string' && isValidTimeZone(data.timezone)) {
        return { timeZone: data.timezone };
      }
    }
  } catch {
    // Primary failed or timed out; try secondary fallback if time remains
  } finally {
    clearTimeout(timeoutId);
  }

  // Secondary fallback: ipapi.co
  const fallbackController = new AbortController();
  const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), timeoutMs);

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: fallbackController.signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.timezone === 'string' && isValidTimeZone(data.timezone)) {
        return {
          timeZone: data.timezone,
          city: typeof data.city === 'string' ? data.city : undefined,
          country: typeof data.country_name === 'string' ? data.country_name : undefined,
        };
      }
    }
  } catch {
    // Both network calls failed or offline
  } finally {
    clearTimeout(fallbackTimeoutId);
  }

  return null;
}

export const wakeTimeService = {
  /**
   * Synchronously retrieves the current wake-up time configuration.
   * On first use, automatically initializes with the local time zone and default wake-up time.
   */
  getWakeTimeConfig(): WakeTimeConfig {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        wakeTime: DEFAULT_WAKE_TIME,
        timeZone: getBrowserTimeZone(),
        isManualOverride: false,
        source: 'default',
        lastDetectedAt: Date.now(),
      };
    }

    try {
      const raw = localStorage.getItem(WAKE_TIME_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WakeTimeConfig>;
        if (parsed && typeof parsed === 'object' && typeof parsed.wakeTime === 'string') {
          const timeZone = isValidTimeZone(parsed.timeZone) ? parsed.timeZone! : getBrowserTimeZone();
          return {
            wakeTime: parsed.wakeTime || DEFAULT_WAKE_TIME,
            timeZone,
            isManualOverride: Boolean(parsed.isManualOverride),
            source: parsed.isManualOverride ? 'manual' : (parsed.source || 'auto-detected'),
            lastDetectedAt: typeof parsed.lastDetectedAt === 'number' ? parsed.lastDetectedAt : Date.now(),
            city: parsed.city,
            country: parsed.country,
          };
        }
      }
    } catch {
      // Corrupt storage payload; re-initialize
    }

    // First-use initialization: auto-detect from browser/OS
    const browserTz = getBrowserTimeZone();
    const initialConfig: WakeTimeConfig = {
      wakeTime: DEFAULT_WAKE_TIME,
      timeZone: browserTz,
      isManualOverride: false,
      source: 'auto-detected',
      lastDetectedAt: Date.now(),
    };

    try {
      localStorage.setItem(WAKE_TIME_STORAGE_KEY, JSON.stringify(initialConfig));
    } catch {
      // Ignore localStorage write failures in restricted environments
    }

    return initialConfig;
  },

  /**
   * Asynchronously refreshes time zone via IP/browser and updates configuration.
   * If the user has NOT customized their wake time (isManualOverride is false),
   * updates the time zone and maintains the default wake time.
   * If the user HAS customized their wake time, updates the time zone for accurate context
   * but strictly preserves their customized wake-up time.
   */
  async refreshTimeZone(force = false): Promise<WakeTimeConfig> {
    const current = this.getWakeTimeConfig();
    const now = Date.now();

    // If cache is still valid and not forcing a refresh, return current config
    if (!force && now - current.lastDetectedAt < TZ_CACHE_TTL_MS && isValidTimeZone(current.timeZone)) {
      return current;
    }

    // Try browser time zone first
    const browserTz = getBrowserTimeZone();
    let detectedTz = browserTz;
    let city = current.city;
    let country = current.country;

    // Verify or supplement with IP geolocation
    try {
      const ipResult = await fetchIpTimeZone();
      if (ipResult && isValidTimeZone(ipResult.timeZone)) {
        detectedTz = ipResult.timeZone;
        city = ipResult.city;
        country = ipResult.country;
      }
    } catch {
      // Retain browser time zone
    }

    const updatedConfig: WakeTimeConfig = {
      ...current,
      timeZone: detectedTz,
      city,
      country,
      lastDetectedAt: now,
      // If manual override is active, keep manual source and wakeTime;
      // if not, retain auto-detected source
      source: current.isManualOverride ? 'manual' : 'auto-detected',
    };

    this.saveConfig(updatedConfig);
    return updatedConfig;
  },

  /**
   * Explicitly sets a manual user wake-up time override.
   * Manual overrides are never overwritten by automatic detection on reloads.
   */
  setManualWakeTime(timeStr: string): WakeTimeConfig {
    const cleanTime = timeStr.trim();
    const current = this.getWakeTimeConfig();

    const updatedConfig: WakeTimeConfig = {
      ...current,
      wakeTime: cleanTime || DEFAULT_WAKE_TIME,
      isManualOverride: true,
      source: 'manual',
    };

    this.saveConfig(updatedConfig);
    return updatedConfig;
  },

  /**
   * Resets the wake-up time to the automatic default and re-detects the current time zone.
   */
  async resetToAuto(): Promise<WakeTimeConfig> {
    const browserTz = getBrowserTimeZone();
    const updatedConfig: WakeTimeConfig = {
      wakeTime: DEFAULT_WAKE_TIME,
      timeZone: browserTz,
      isManualOverride: false,
      source: 'auto-detected',
      lastDetectedAt: Date.now(),
    };

    this.saveConfig(updatedConfig);
    // Refresh with network IP detection if available
    return this.refreshTimeZone(true);
  },

  /**
   * Returns suggested wake-up time for a new dream entry.
   * Prioritizes user's manual override, then recent dream history average/mode, then auto default.
   */
  async getSuggestedWakeTime(): Promise<string> {
    const config = this.getWakeTimeConfig();
    if (config.isManualOverride && config.wakeTime) {
      return config.wakeTime;
    }

    // Inspect user's recent non-sample dream entries to see if they have an established pattern
    try {
      const recent = await db.dreams
        .orderBy('createdAt')
        .reverse()
        .filter((d) => Boolean(d.wakeUpTime && !d.isSample))
        .limit(10)
        .toArray();

      if (recent.length >= 3) {
        const counts: Record<string, number> = {};
        for (const dream of recent) {
          if (dream.wakeUpTime) {
            counts[dream.wakeUpTime] = (counts[dream.wakeUpTime] || 0) + 1;
          }
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0 && sorted[0][1] >= 2) {
          return sorted[0][0];
        }
      }
    } catch {
      // Fallback to configured default
    }

    return config.wakeTime || DEFAULT_WAKE_TIME;
  },

  /**
   * Persists the configuration object to localStorage and dispatches a change event
   */
  saveConfig(config: WakeTimeConfig): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(WAKE_TIME_STORAGE_KEY, JSON.stringify(config));
      window.dispatchEvent(
        new CustomEvent(WAKE_TIME_CHANGED_EVENT, { detail: config })
      );
    } catch {
      // ignore
    }
  },
};

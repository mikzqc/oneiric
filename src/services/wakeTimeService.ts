export interface WakeTimeConfig {
  wakeTime: string; // HH:mm format, e.g. "07:30", "18:15"
  timeZone: string; // IANA identifier, e.g. "Asia/Kolkata", "America/New_York"
  isManualOverride: boolean; // true if user explicitly entered or modified their wake-up time
  source: 'current-time' | 'manual';
  lastDetectedAt: number; // timestamp in ms
  city?: string;
  country?: string;
}

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
 * Gets the current clock time formatted as HH:mm in the specified IANA time zone.
 * Uses actual current time, avoiding fixed hardcoded hours or inferred values.
 */
export function getCurrentTimeInTimeZone(timeZone?: string, date: Date = new Date()): string {
  const tz = isValidTimeZone(timeZone) ? timeZone! : getBrowserTimeZone();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let hour = '';
    let minute = '';
    for (const part of parts) {
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
    }
    if (hour && minute) {
      // In some locales/engines, 24:00 may be returned for midnight
      if (hour === '24') hour = '00';
      return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
  } catch {
    // Fallback to local machine time if timeZone formatting fails
  }

  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
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
   * If the user has not set a manual override, wakeTime is dynamically computed
   * from the actual current clock time in their detected time zone.
   */
  getWakeTimeConfig(): WakeTimeConfig {
    const browserTz = getBrowserTimeZone();

    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        wakeTime: getCurrentTimeInTimeZone(browserTz),
        timeZone: browserTz,
        isManualOverride: false,
        source: 'current-time',
        lastDetectedAt: Date.now(),
      };
    }

    try {
      const raw = localStorage.getItem(WAKE_TIME_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WakeTimeConfig>;
        if (parsed && typeof parsed === 'object') {
          const timeZone = isValidTimeZone(parsed.timeZone) ? parsed.timeZone! : browserTz;
          const isManual = Boolean(parsed.isManualOverride);

          // If manual override: use saved manual wakeTime.
          // If auto: use the actual CURRENT clock time in that time zone!
          const wakeTime = isManual && typeof parsed.wakeTime === 'string' && parsed.wakeTime.trim()
            ? parsed.wakeTime.trim()
            : getCurrentTimeInTimeZone(timeZone);

          return {
            wakeTime,
            timeZone,
            isManualOverride: isManual,
            source: isManual ? 'manual' : 'current-time',
            lastDetectedAt: typeof parsed.lastDetectedAt === 'number' ? parsed.lastDetectedAt : Date.now(),
            city: parsed.city,
            country: parsed.country,
          };
        }
      }
    } catch {
      // Corrupt storage payload; re-initialize below
    }

    // First-use initialization: auto-detect from browser/OS with current clock time
    const initialConfig: WakeTimeConfig = {
      wakeTime: getCurrentTimeInTimeZone(browserTz),
      timeZone: browserTz,
      isManualOverride: false,
      source: 'current-time',
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
   * Returns the initial wake-up time to populate a new entry.
   * Uses manual override if user configured one, otherwise actual current clock time.
   */
  getInitialWakeTime(): string {
    return this.getWakeTimeConfig().wakeTime;
  },

  /**
   * Asynchronously refreshes time zone via IP/browser and updates configuration.
   * Preserves manual user overrides if set.
   * For automatic users, updates the time zone and recalculates current time.
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
      wakeTime: current.isManualOverride
        ? current.wakeTime
        : getCurrentTimeInTimeZone(detectedTz),
      source: current.isManualOverride ? 'manual' : 'current-time',
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
      wakeTime: cleanTime || getCurrentTimeInTimeZone(current.timeZone),
      isManualOverride: true,
      source: 'manual',
    };

    this.saveConfig(updatedConfig);
    return updatedConfig;
  },

  /**
   * Resets the wake-up time to automatic current clock time and re-detects the current time zone.
   */
  async resetToAuto(): Promise<WakeTimeConfig> {
    const browserTz = getBrowserTimeZone();
    const updatedConfig: WakeTimeConfig = {
      wakeTime: getCurrentTimeInTimeZone(browserTz),
      timeZone: browserTz,
      isManualOverride: false,
      source: 'current-time',
      lastDetectedAt: Date.now(),
    };

    this.saveConfig(updatedConfig);
    return this.refreshTimeZone(true);
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

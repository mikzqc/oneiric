/**
 * Returns current date in local YYYY-MM-DD format
 */
export function getTodayDateString(dateObj: Date = new Date()): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD safely into a local Date object (at midnight)
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Formats YYYY-MM-DD to human friendly string, e.g. "Oct 14, 2026"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats YYYY-MM-DD to full friendly string with weekday, e.g. "Wednesday, Oct 14, 2026"
 */
export function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats timestamp to readable time string, e.g. "07:30 AM"
 */
export function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Calculates current dream journaling streak accurately from a set of recorded dates.
 * A streak is consecutive days of recorded dreams ending either today or yesterday.
 */
export function calculateJournalingStreak(dates: string[], referenceDate: Date = new Date()): number {
  if (!dates || dates.length === 0) return 0;

  // Unique sorted dates descending
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  const todayStr = getTodayDateString(referenceDate);

  const yesterdayDate = new Date(referenceDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getTodayDateString(yesterdayDate);

  // Check if latest date is today or yesterday
  const latestDate = uniqueDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0; // Streak broken
  }

  let streak = 0;
  let currentDate = parseLocalDate(latestDate);

  const dateSet = new Set(uniqueDates);

  while (true) {
    const checkStr = getTodayDateString(currentDate);
    if (dateSet.has(checkStr)) {
      streak++;
      // step back one day
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Returns date strings for the past N days inclusive of today.
 */
export function getLastNDays(days: number = 7, referenceDate: Date = new Date()): { dateStr: string; label: string; dayOfWeek: string }[] {
  const result: { dateStr: string; label: string; dayOfWeek: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = getTodayDateString(d);
    const label = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    const dayOfWeek = d.toLocaleDateString(undefined, { weekday: 'short' });
    result.push({ dateStr, label, dayOfWeek });
  }
  return result;
}

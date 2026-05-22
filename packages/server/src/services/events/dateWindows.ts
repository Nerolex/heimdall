/** Get today's date in Europe/Berlin timezone as YYYY-MM-DD */
function getBerlinDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Get day of week in Berlin timezone (0=Sunday, 6=Saturday) */
function getBerlinDayOfWeek(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
  }).formatToParts(date);
  const weekday = parts.find(p => p.type === 'weekday')?.value;
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday ?? 'Mon'] ?? 1;
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function getTodayWindow(): { windowStart: string; windowEnd: string } {
  const today = getBerlinDate();
  return { windowStart: today, windowEnd: today };
}

export function getWeekendWindow(): { windowStart: string; windowEnd: string } {
  const now = new Date();
  const today = getBerlinDate(now);
  const dow = getBerlinDayOfWeek(now);
  if (dow === 6) {
    return { windowStart: today, windowEnd: addDays(today, 1) };
  }
  if (dow === 0) {
    return { windowStart: today, windowEnd: today };
  }
  const daysUntilSat = 6 - dow;
  const sat = addDays(today, daysUntilSat);
  const sun = addDays(today, daysUntilSat + 1);
  return { windowStart: sat, windowEnd: sun };
}

export function getUpcomingWindow(days: number = 7): { windowStart: string; windowEnd: string } {
  const today = getBerlinDate();
  return { windowStart: today, windowEnd: addDays(today, days - 1) };
}

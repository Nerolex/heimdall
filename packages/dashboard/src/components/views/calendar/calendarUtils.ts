import type { CalendarEvent } from '@heimdall/shared';

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Heute';
  if (d.toDateString() === tomorrow.toDateString()) return 'Morgen';
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = new Date(event.start).toDateString();
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(event);
  }
  return groups;
}

function getDayBoundaries(date: Date): { dayStart: Date; dayEnd: Date } {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return { dayStart, dayEnd };
}

export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const { dayStart, dayEnd } = getDayBoundaries(date);
  return events.filter((e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    return start <= dayEnd && end >= dayStart;
  });
}

export function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const { dayStart, dayEnd } = getDayBoundaries(day);
  const start = new Date(event.start);
  const end = new Date(event.end);
  return start <= dayEnd && end >= dayStart;
}

/**
 * Returns the visible start/end hour positions for a timed event on a specific day,
 * clamped to the given grid range. Handles multi-day and overnight events that
 * only partially overlap the current day.
 */
export function clampEventToGrid(
  event: CalendarEvent,
  day: Date,
  gridStart: number,
  gridEnd: number
): { clampedStart: number; clampedEnd: number } {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const eventStartMs = Math.max(new Date(event.start).getTime(), dayStart.getTime());
  const eventEndMs = Math.min(new Date(event.end).getTime(), dayEnd.getTime());

  const startDate = new Date(eventStartMs);
  const endDate = new Date(eventEndMs);

  const clampedStart = Math.max(startDate.getHours() + startDate.getMinutes() / 60, gridStart);
  const clampedEnd = Math.min(endDate.getHours() + endDate.getMinutes() / 60, gridEnd);

  return { clampedStart, clampedEnd };
}

export function getHourPosition(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

export function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = new Array(startWeekday).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return weeks;
}

export type WeekMode = 'week' | 'rolling';

/**
 * Returns 7 days for the week view.
 * - "week" (default): current calendar week Mon–Sun
 * - "rolling": next 7 days starting from today
 */
export function getWeekDays(mode: WeekMode = 'week'): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (mode === 'rolling') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }

  // mode === 'week': start from Monday of the current week
  const monday = new Date(today);
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(today.getDate() + diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

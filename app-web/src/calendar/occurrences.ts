import type { CalendarDate, CalendarSettings, Recurrence } from "@dm/schemas";

/**
 * Event occurrence computation over the world calendar (records-editor
 * decision 12): pure, calendar-aware (variable month lengths, weeks of
 * any length), clamped to the queried year. Only day-resolvable events
 * mark days — partial dates (year or year+month only) stay unmarked, a
 * recorded limitation.
 */

/** A day-resolvable calendar point: 1-based month/day into the definition. */
type Point = { year: number; month: number; day: number };

/**
 * Numeric year coordinate without the missing year 0: 1→0, 2→1, −1→−1 —
 * no gap, so day spans across the −1/1 boundary stay continuous.
 */
function yearCoord(year: number): number {
  return year > 0 ? year - 1 : year;
}

function yearFromCoord(coord: number): number {
  return coord >= 0 ? coord + 1 : coord;
}

function yearLength(calendar: CalendarSettings): number {
  return calendar.months.reduce((sum, month) => sum + month.days, 0);
}

function monthDays(calendar: CalendarSettings, month: number): number {
  return calendar.months[month - 1]?.days ?? 1;
}

/** Absolute day number on the calendar timeline (era-agnostic). */
function absoluteDay(point: Point, calendar: CalendarSettings): number {
  const monthsBefore = calendar.months
    .slice(0, point.month - 1)
    .reduce((sum, month) => sum + month.days, 0);
  return yearCoord(point.year) * yearLength(calendar) + monthsBefore + point.day;
}

/** Absolute day number of a full date — exposed for the moon cycle
 * display in the year overview. */
export function absoluteDayIndex(
  year: number,
  month: number,
  day: number,
  calendar: CalendarSettings,
): number {
  return absoluteDay({ year, month, day }, calendar);
}

function addDays(point: Point, days: number, calendar: CalendarSettings): Point {
  const yLen = yearLength(calendar);
  const abs = absoluteDay(point, calendar) + days;
  let coord = Math.floor(abs / yLen);
  let remainder = abs - coord * yLen;
  if (remainder === 0) {
    // Day 0 does not exist: this is the last day of the previous year.
    coord -= 1;
    remainder = yLen;
  }
  for (let index = 0; index < calendar.months.length; index += 1) {
    const length = calendar.months[index].days;
    if (remainder <= length) {
      return { year: yearFromCoord(coord), month: index + 1, day: remainder };
    }
    remainder -= length;
  }
  // Unreachable: the remainder always lands inside a month.
  const last = calendar.months.length;
  return { year: yearFromCoord(coord), month: last, day: monthDays(calendar, last) };
}

/** Steps a point forward by unit × interval (calendar-aware). */
function advance(
  point: Point,
  unit: Recurrence["unit"],
  interval: number,
  calendar: CalendarSettings,
): Point {
  if (unit === "week") {
    return addDays(point, calendar.week.days * interval, calendar);
  }
  if (unit === "year") {
    const coord = yearCoord(point.year) + interval;
    return {
      year: yearFromCoord(coord),
      month: point.month,
      day: Math.min(point.day, monthDays(calendar, point.month)),
    };
  }
  // Month: step the flat month index, clamping the day to the target month.
  const monthsTotal = calendar.months.length;
  const flat = yearCoord(point.year) * monthsTotal + (point.month - 1) + interval;
  const coord = Math.floor(flat / monthsTotal);
  const month = (((flat % monthsTotal) + monthsTotal) % monthsTotal) + 1;
  return {
    year: yearFromCoord(coord),
    month,
    day: Math.min(point.day, monthDays(calendar, month)),
  };
}

/** Only full (year, month, day) dates inside the defined months resolve. */
function dateToPoint(date: CalendarDate, calendar: CalendarSettings): Point | null {
  if (date.month === undefined || date.day === undefined) return null;
  if (date.month < 1 || date.month > calendar.months.length) return null;
  if (date.day > monthDays(calendar, date.month)) return null;
  return { year: date.year, month: date.month, day: date.day };
}

export type EventRef = { slug: string; title: string };

export type EventInput = {
  slug: string;
  title: string;
  fields: {
    start?: CalendarDate;
    end?: CalendarDate;
    recurrence?: Recurrence;
  };
};

/** One event's occurrences, added day by day through the add callback. */
function collectEvent(
  event: EventInput,
  calendar: CalendarSettings,
  window: { startAbs: number; endAbs: number },
  add: (point: Point, ref: EventRef) => void,
): void {
  const ref: EventRef = { slug: event.slug, title: event.title };
  const start = event.fields.start
    ? dateToPoint(event.fields.start, calendar)
    : null;
  if (!start) return;
  const end = event.fields.end ? dateToPoint(event.fields.end, calendar) : null;
  const span = end ? Math.max(0, absoluteDay(end, calendar) - absoluteDay(start, calendar)) : 0;
  const recurrence = event.fields.recurrence;
  if (!recurrence || recurrence.unit === undefined) {
    addRange(start, span, ref, calendar, add);
    return;
  }
  // Anchored on the start, stepping forward; an occurrence counts when
  // its span intersects the queried year.
  let occurrence = start;
  for (let step = 0; step < 10_000; step += 1) {
    const occurrenceStart = absoluteDay(occurrence, calendar);
    if (occurrenceStart > window.endAbs) break;
    if (occurrenceStart + span >= window.startAbs) {
      addRange(occurrence, span, ref, calendar, add);
    }
    occurrence = advance(
      occurrence,
      recurrence.unit,
      recurrence.interval,
      calendar,
    );
  }
}

function addRange(
  from: Point,
  spanDays: number,
  ref: EventRef,
  calendar: CalendarSettings,
  add: (point: Point, ref: EventRef) => void,
): void {
  for (let offset = 0; offset <= spanDays; offset += 1) {
    add(addDays(from, offset, calendar), ref);
  }
}

/**
 * Days of the queried year that carry at least one event occurrence,
 * keyed "month-day" (1-based). Periods mark their inclusive day span,
 * recurrences repeat the start's span from the anchor forward, all
 * clamped to the year.
 */
export function dayOccurrences(
  events: EventInput[],
  calendar: CalendarSettings,
  year: number,
): Map<string, EventRef[]> {
  const result = new Map<string, EventRef[]>();
  const lastMonth = calendar.months.length;
  const window = {
    startAbs: absoluteDay({ year, month: 1, day: 1 }, calendar),
    endAbs: absoluteDay(
      { year, month: lastMonth, day: monthDays(calendar, lastMonth) },
      calendar,
    ),
  };
  const add = (point: Point, ref: EventRef): void => {
    if (point.year !== year) return; // clamp: only the queried year's days
    const key = `${point.month}-${point.day}`;
    const list = result.get(key) ?? [];
    if (!list.some((entry) => entry.slug === ref.slug)) list.push(ref);
    result.set(key, list);
  };
  for (const event of events) {
    collectEvent(event, calendar, window, add);
  }
  return result;
}

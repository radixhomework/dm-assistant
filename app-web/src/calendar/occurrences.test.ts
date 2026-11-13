import { describe, expect, it } from "vitest";
import { dayOccurrences, type EventInput } from "./occurrences.js";
import type { CalendarSettings } from "@dm/schemas";

/** Two-month test calendar: M1 30 days, M2 31 days; 8-day weeks. */
const calendar: CalendarSettings = {
  months: [
    { name: "M1", days: 30 },
    { name: "M2", days: 31 },
  ],
  week: { days: 8 },
  dayNames: ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"],
  moon: { name: "Lune", cycleDays: 29 },
};

function event(
  slug: string,
  fields: EventInput["fields"],
): EventInput {
  return { slug, title: slug, fields };
}

describe("dayOccurrences", () => {
  it("marks a punctual start", () => {
    const result = dayOccurrences(
      [event("fete", { start: { year: 842, month: 1, day: 5 } })],
      calendar,
      842,
    );
    expect([...result.keys()]).toEqual(["1-5"]);
    expect(result.get("1-5")).toEqual([{ slug: "fete", title: "fete" }]);
  });

  it("marks inclusive periods across months", () => {
    const result = dayOccurrences(
      [event("fete", { start: { year: 842, month: 1, day: 29 }, end: { year: 842, month: 2, day: 2 } })],
      calendar,
      842,
    );
    expect([...result.keys()].sort()).toEqual(["1-29", "1-30", "2-1", "2-2"]);
  });

  it("expands monthly recurrences into the queried year", () => {
    const result = dayOccurrences(
      [event("marche", { start: { year: 841, month: 1, day: 5 }, recurrence: { unit: "month", interval: 1 } })],
      calendar,
      842,
    );
    expect([...result.keys()].sort()).toEqual(["1-5", "2-5"]);
  });

  it("expands weekly recurrences with calendar-aware weeks", () => {
    // 8-day weeks, interval 2 → every 16 days: 1-1, 1-17, 2-3, 2-19.
    const result = dayOccurrences(
      [event("marche", { start: { year: 842, month: 1, day: 1 }, recurrence: { unit: "week", interval: 2 } })],
      calendar,
      842,
    );
    expect([...result.keys()].sort()).toEqual(["1-1", "1-17", "2-19", "2-3"]);
  });

  it("repeats the start's span for recurring periods", () => {
    const result = dayOccurrences(
      [
        event("foire", {
          start: { year: 842, month: 1, day: 10 },
          end: { year: 842, month: 1, day: 12 },
          recurrence: { unit: "month", interval: 1 },
        }),
      ],
      calendar,
      842,
    );
    expect([...result.keys()].sort()).toEqual(["1-10", "1-11", "1-12", "2-10", "2-11", "2-12"]);
  });

  it("leaves partial dates unmarked", () => {
    const result = dayOccurrences(
      [
        event("an", { start: { year: 842 } }),
        event("saison", { start: { year: 842, month: 2 } }),
      ],
      calendar,
      842,
    );
    expect(result.size).toBe(0);
  });

  it("clamps cross-year periods to the queried year", () => {
    const result = dayOccurrences(
      [event("hiver", { start: { year: 841, month: 2, day: 30 }, end: { year: 842, month: 1, day: 2 } })],
      calendar,
      842,
    );
    expect([...result.keys()].sort()).toEqual(["1-1", "1-2"]);
  });

  it("keeps continuous spans across the missing year 0", () => {
    // −1-02-30 → 1-01-01 spans exactly two days (no year 0 between them).
    const result = dayOccurrences(
      [event("renaissance", { start: { year: -1, month: 2, day: 30 }, end: { year: 1, month: 1, day: 2 } })],
      calendar,
      1,
    );
    expect([...result.keys()].sort()).toEqual(["1-1", "1-2"]);
  });

  it("skips events without a start", () => {
    const result = dayOccurrences([event("fantome", {})], calendar, 842);
    expect(result.size).toBe(0);
  });

  it("lists several events on the same day without duplicates", () => {
    const result = dayOccurrences(
      [
        event("a", { start: { year: 842, month: 1, day: 5 } }),
        event("b", { start: { year: 842, month: 1, day: 5 } }),
      ],
      calendar,
      842,
    );
    expect(result.get("1-5")).toEqual([
      { slug: "a", title: "a" },
      { slug: "b", title: "b" },
    ]);
  });
});

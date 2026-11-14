import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api } from "../api/client.js";
import {
  absoluteDayIndex,
  dayOccurrences,
  type EventRef,
} from "../calendar/occurrences.js";
import { isCalendarDefinition } from "../calendar/use-calendar.js";
import { SlugTitleFields } from "../components/slug-fields.js";
import { useSlugAutoFill } from "../slug.js";
import { formString } from "../forms.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { CalendarDate, CalendarSettings, Recurrence } from "@dm/schemas";
import type { Entity } from "../types.js";

type EventFields = { start?: CalendarDate; end?: CalendarDate; recurrence?: Recurrence };

/** Navigation skips the missing year 0 (previous of 1 is −1). */
function stepYear(year: number, direction: 1 | -1): number {
  const next = year + direction;
  return next === 0 ? year + 2 * direction : next;
}

/** The four moon phases of the cycle, starting at the new moon. */
type MoonPhase = "new" | "waxing" | "full" | "waning";

function moonPhase(dayInCycle: number, cycleDays: number): MoonPhase {
  const quarter = cycleDays / 4;
  const index = Math.floor(dayInCycle / quarter);
  if (index <= 0) return "new";
  if (index === 1) return "waxing";
  if (index === 2) return "full";
  return "waning";
}

/** Tiny moon glyph: dashed circle (new), right half (waxing), filled
 * (full), left half (waning). */
const moonShapes: Record<MoonPhase, React.ReactNode> = {
  new: <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" />,
  waxing: (
    <>
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" />
      <path d="M5 1.5 A3.5 3.5 0 0 1 5 8.5 Z" fill="currentColor" />
    </>
  ),
  full: <circle cx="5" cy="5" r="3.5" fill="currentColor" />,
  waning: (
    <>
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1" />
      <path d="M5 1.5 A3.5 3.5 0 0 0 5 8.5 Z" fill="currentColor" />
    </>
  ),
};

function MoonGlyph(props: { readonly phase: MoonPhase }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden fill="none">
      {moonShapes[props.phase]}
    </svg>
  );
}

const moonPhaseKeys: Record<MoonPhase, string> = {
  new: "calendar.moon.new",
  waxing: "calendar.moon.waxing",
  full: "calendar.moon.full",
  waning: "calendar.moon.waning",
};

/**
 * Year overview (records-editor decision 12): every month of the
 * definition in a responsive grid with the moon cycle per day, year
 * navigation (arrows and a jump input), event indicators per day, and a
 * clickable day listing its events with a creation shortcut.
 */
export function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const slugFields = useSlugAutoFill();
  const [chosenYear, setChosenYear] = useState<number | null>(null);
  const [yearDraft, setYearDraft] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calendar = useQuery({
    queryKey: ["calendar-settings"],
    queryFn: () => api<CalendarSettings | null>("/api/settings/calendar"),
    enabled: ready,
  });
  const definition = isCalendarDefinition(calendar.data)
    ? calendar.data
    : null;
  const events = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => api<Entity[]>("/api/records?type=events&perimeter=world"),
    enabled: ready,
  });

  // Default year: the world's current year from the definition.
  const year = chosenYear ?? definition?.currentYear ?? 1;

  const occurrences = useMemo(
    () =>
      definition
        ? dayOccurrences(
            (events.data ?? []).map((entity) => ({
              slug: entity.slug,
              title: entity.title,
              fields: (entity.fields ?? {}) as EventFields,
            })),
            definition,
            year,
          )
        : null,
    [definition, events.data, year],
  );

  if (!ready) return null;
  if (calendar.isPending || events.isPending)
    return <p className="text-muted">{t("common.loading")}</p>;
  if (definition === null) {
    return (
      <div>
        <h1 className="font-display text-4xl font-semibold text-ink">
          {t("calendar.title")}
        </h1>
        <p className="mt-3 text-muted">{t("calendar.notDefined")}</p>
        <p className="mt-1 text-sm text-muted">
          <Link to="/admin" className="text-accent hover:underline">
            {t("calendar.defineHint")}
          </Link>
        </p>
      </div>
    );
  }

  function onJumpToYear(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Math.trunc(Number(yearDraft));
    if (Number.isFinite(value) && value !== 0) setChosenYear(value);
    setYearDraft(null);
  }

  async function onCreateEvent(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedDay === null) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    const [month, day] = selectedDay.split("-").map(Number);
    try {
      await api("/api/records", {
        method: "POST",
        body: {
          slug: formString(form, "slug"),
          type: "events",
          perimeter: "world",
          title: formString(form, "title"),
          fields: { start: { year, month, day } },
        },
      });
      setCreating(false);
      // Straight into editing the freshly created event.
      void navigate({
        to: "/records/$slug",
        params: { slug: formString(form, "slug") },
        search: { edit: "1" },
      });
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  const selectedRefs: EventRef[] | undefined = selectedDay
    ? occurrences?.get(selectedDay)
    : undefined;
  const [selectedMonth, selectedDayNumber] = (selectedDay ?? "").split("-");
  const cycleDays = definition.moon.cycleDays;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-4xl font-semibold text-ink">
          {t("calendar.title")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("calendar.previous")}
            onClick={() => setChosenYear(stepYear(year, -1))}
            className="rounded-md border border-border p-1.5 text-ink transition-colors duration-200 hover:bg-surface"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <form onSubmit={onJumpToYear}>
            <input
              type="number"
              aria-label={t("calendar.goToYear")}
              title={t("calendar.goToYear")}
              value={yearDraft ?? String(year)}
              onChange={(event) => setYearDraft(event.target.value)}
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-center font-display text-2xl text-ink"
            />
          </form>
          <button
            type="button"
            aria-label={t("calendar.next")}
            onClick={() => setChosenYear(stepYear(year, 1))}
            className="rounded-md border border-border p-1.5 text-ink transition-colors duration-200 hover:bg-surface"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{t("calendar.moonLegend")}</span>
        {(["new", "waxing", "full", "waning"] as const).map((phase) => (
          <span key={phase} className="flex items-center gap-1">
            <MoonGlyph phase={phase} />
            {t(moonPhaseKeys[phase])}
          </span>
        ))}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {definition.months.map((month, monthIndex) => {
          // Which weekday the 1st falls on: day 1 of the year is the first
          // weekday name; the offset is the days-before count mod the week.
          const daysBefore = definition.months
            .slice(0, monthIndex)
            .reduce((sum, month) => sum + month.days, 0);
          const firstOffset =
            ((daysBefore % definition.week.days) + definition.week.days) %
            definition.week.days;
          return (
            <section key={month.name} className="rounded-lg border border-border bg-surface p-3">
              <h2 className="font-display text-xl text-ink">{month.name}</h2>
              <div
                className="mt-2 grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${definition.week.days}, minmax(0, 1fr))` }}
              >
                {definition.dayNames.map((name) => (
                  <span key={name} className="truncate text-center text-[10px] text-muted">
                    {name}
                  </span>
                ))}
                {Array.from({ length: month.days }).map((_, dayIndex) => {
                  const day = dayIndex + 1;
                  const key = `${monthIndex + 1}-${day}`;
                  const refs = occurrences?.get(key);
                  // The 1st shifts to its weekday column (no filler cells).
                  const columnStart = day === 1 ? firstOffset + 1 : undefined;
                  const dayInCycle =
                    ((absoluteDayIndex(year, monthIndex + 1, day, definition) %
                      cycleDays) +
                      cycleDays) %
                    cycleDays;
                  const phase = moonPhase(dayInCycle, cycleDays);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      title={`${day} ${month.name}`}
                      style={{ gridColumnStart: columnStart }}
                      className={`relative rounded px-0 py-0.5 text-center text-xs transition-colors duration-200 ${
                        refs
                          ? "bg-accent/20 font-semibold text-ink hover:bg-accent/40"
                          : "text-muted hover:bg-surface"
                      } ${selectedDay === key ? "ring-1 ring-accent" : ""}`}
                    >
                      {day}
                      <span className="block leading-none">
                        <span className="inline-block text-muted">
                          <MoonGlyph phase={phase} />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {selectedDay && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-ink">
              {t("calendar.dayHeading", {
                day: selectedDayNumber,
                month: definition.months[Number(selectedMonth) - 1]?.name,
                year,
              })}
            </h2>
            <button
              type="button"
              onClick={() => {
                slugFields.reset();
                setError(null);
                setCreating((value) => !value);
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-background transition-colors duration-200 hover:bg-accent"
            >
              <Plus className="mr-1 inline size-4" aria-hidden />
              {t("calendar.newEvent")}
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-radish">{error}</p>}
          {(selectedRefs ?? []).length === 0 ? (
            <p className="mt-2 text-muted">{t("calendar.emptyDay")}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {(selectedRefs ?? []).map((ref) => (
                <li key={ref.slug}>
                  <Link
                    to="/records/$slug"
                    params={{ slug: ref.slug }}
                    className="text-accent hover:underline"
                  >
                    {ref.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {creating && (
            <form
              onSubmit={onCreateEvent}
              className="mt-3 flex max-w-md flex-col gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <SlugTitleFields fields={slugFields} />
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent"
              >
                {t("calendar.create")}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

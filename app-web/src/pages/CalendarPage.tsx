import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client.js";
import { dayOccurrences, type EventRef } from "../calendar/occurrences.js";
import { isCalendarDefinition } from "../calendar/use-calendar.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { CalendarDate, CalendarSettings, Recurrence } from "@dm/schemas";
import type { Entity } from "../types.js";

type EventFields = { start?: CalendarDate; end?: CalendarDate; recurrence?: Recurrence };

/** Navigation skips the missing year 0 (previous of 1 is −1). */
function stepYear(year: number, direction: 1 | -1): number {
  const next = year + direction;
  return next === 0 ? year + 2 * direction : next;
}

/**
 * Year overview (records-editor decision 12): every month of the
 * definition in a responsive grid, previous/next year navigation, event
 * indicators per day, and a clickable day listing its events below.
 */
export function CalendarPage() {
  const { t } = useTranslation();
  const { ready } = useRequireAuth();
  const [chosenYear, setChosenYear] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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

  const eventInputs = (events.data ?? []).map((entity) => ({
    slug: entity.slug,
    title: entity.title,
    fields: (entity.fields ?? {}) as EventFields,
  }));
  // Default year: the first event's start year, else year 1.
  const year =
    chosenYear ??
    eventInputs.find((event) => event.fields.start)?.fields.start?.year ?? 1;

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
  const selectedRefs: EventRef[] | undefined = selectedDay
    ? occurrences?.get(selectedDay)
    : undefined;
  const [selectedMonth, selectedDayNumber] = (selectedDay ?? "").split("-");

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
          <span className="font-display text-2xl text-ink">{year}</span>
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                {Array.from({ length: firstOffset }).map((_, blank) => (
                  <span key={`blank-${blank}`} />
                ))}
                {Array.from({ length: month.days }).map((_, dayIndex) => {
                  const day = dayIndex + 1;
                  const key = `${monthIndex + 1}-${day}`;
                  const refs = occurrences?.get(key);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      title={`${day} ${month.name}`}
                      className={`relative rounded px-0 py-1 text-center text-xs transition-colors duration-200 ${
                        refs
                          ? "bg-accent/20 font-semibold text-ink hover:bg-accent/40"
                          : "text-muted hover:bg-surface"
                      } ${selectedDay === key ? "ring-1 ring-accent" : ""}`}
                    >
                      {day}
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
          <h2 className="font-display text-2xl text-ink">
            {t("calendar.dayHeading", {
              day: selectedDayNumber,
              month: definition.months[Number(selectedMonth) - 1]?.name,
              year,
            })}
          </h2>
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
        </section>
      )}
    </div>
  );
}

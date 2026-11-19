import { useTranslation } from "react-i18next";
import { useCalendarDefinition } from "../calendar/use-calendar.js";
import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
  SheetChips,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";
import type { CalendarDate, Recurrence } from "@dm/schemas";

/** The date chip text: a period renders both bounds, a punctual event
 * renders the start only, no start means no chip. */
function dateChipOf(
  start: CalendarDate | undefined,
  end: CalendarDate | undefined,
  dateText: (date: CalendarDate) => string,
): string | undefined {
  if (start === undefined) return undefined;
  if (end === undefined) return dateText(start);
  return `${dateText(start)} → ${dateText(end)}`;
}

/**
 * The bespoke sheet for "Events" (world → Chronicle): the illustration
 * as a banner, the calendar dates and recurrence as header chips, the
 * place of origin as the structural reference, the two descriptions as
 * headed frameless prose sections, then the associative references just
 * before the scaffold backlinks section.
 */
export function EventSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const { definition } = useCalendarDefinition();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    start?: CalendarDate;
    end?: CalendarDate;
    recurrence?: Recurrence;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  function dateText(date: CalendarDate): string {
    const monthName =
      definition && date.month !== undefined
        ? definition.months[date.month - 1]?.name
        : undefined;
    const params: Record<string, string | number> = { year: date.year };
    const monthValue = monthName ?? date.month;
    if (date.day !== undefined) params.day = date.day;
    // Partial dates render at their own granularity — year-only dates
    // keep the month parameter absent — and the era prefixes the whole.
    if (monthValue !== undefined) params.month = monthValue;
    const prefix = date.era ? `${date.era} ` : "";
    if (params.day !== undefined) return prefix + t("calendar.formatDay", params);
    if (date.month !== undefined) return prefix + t("calendar.formatMonth", params);
    return prefix + t("calendar.formatYear", params);
  }

  const dateChip = dateChipOf(fields.start, fields.end, dateText);

  const unitLabels: Record<string, string> = {
    week: t("recurrence.weeks"),
    month: t("recurrence.months"),
    year: t("recurrence.years"),
  };
  const recurrenceChip: string | undefined =
    fields.recurrence === undefined
      ? undefined
      : t("events.everyInterval", {
          interval: fields.recurrence.interval,
          unit: unitLabels[fields.recurrence.unit] ?? fields.recurrence.unit,
        });

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (dateChip !== undefined) {
    chips.push({ label: fields.end !== undefined ? t("events.period") : t("fields.start"), value: dateChip });
  }
  if (recurrenceChip !== undefined) {
    chips.push({ label: t("fields.recurrence"), value: recurrenceChip });
  }

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <SheetChips chips={chips} />
      <ReferenceGroups
        groups={[["origin", "fields.origin"]]}
        references={references}
        className="mt-4"
      />
      <ProseSections
        blocks={[
          ["fields.public_description", fields.public_description ?? ""],
          ["fields.private_description", fields.private_description ?? ""],
        ]}
      />
      <ReferenceGroups
        groups={[
          ["geography", "fields.geography"],
          ["characters", "fields.characters"],
          ["events", "fields.events"],
        ]}
        references={references}
        className="mt-8"
      />
    </div>
  );
}

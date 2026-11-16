import { useTranslation } from "react-i18next";
import { useCalendarDefinition } from "../calendar/use-calendar.js";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";
import type { CalendarDate, Recurrence } from "@dm/schemas";

/**
 * The bespoke sheet for "Events" (world → Chronicle): the illustration
 * as a banner, the calendar dates and recurrence as header chips (the
 * event is the calendar registry), the place of origin as the
 * structural reference, the two descriptions as headed frameless prose
 * sections, then the associative references (geography, characters,
 * events) just before the scaffold's backlinks section.
 */
export function EventSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    start?: CalendarDate;
    end?: CalendarDate;
    recurrence?: Recurrence;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const originGroup: Array<readonly [string, string]> = [
    ["origin", "fields.origin"],
  ];
  const bottomReferenceGroups: Array<readonly [string, string]> = [
    ["geography", "fields.geography"],
    ["characters", "fields.characters"],
    ["events", "fields.events"],
  ];

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

  // Dates read through the world calendar definition (month names) —
  // the same localized form as the scaffold's generic date rendering.
  const { definition } = useCalendarDefinition();
  function dateText(date: CalendarDate): string {
    const monthName =
      definition && date.month !== undefined
        ? definition.months[date.month - 1]?.name
        : undefined;
    const params: Record<string, string | number> = { year: date.year };
    if (date.day !== undefined) params.day = date.day;
    params.month = monthName ?? date.month ?? "";
    if (params.day !== undefined) return t("calendar.formatDay", params);
    if (date.month !== undefined) return t("calendar.formatMonth", params);
    return t("calendar.formatYear", params);
  }

  const dateChip: string | undefined =
    fields.start === undefined
      ? undefined
      : fields.end !== undefined
        ? `${dateText(fields.start)} → ${dateText(fields.end)}`
        : dateText(fields.start);

  const recurrenceChip: string | undefined =
    fields.recurrence === undefined
      ? undefined
      : t("events.everyInterval", {
          interval: fields.recurrence.interval,
          unit: t(
            fields.recurrence.unit === "week"
              ? "recurrence.weeks"
              : fields.recurrence.unit === "month"
                ? "recurrence.months"
                : "recurrence.years",
          ),
        });

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (dateChip !== undefined) {
    chips.push({ label: fields.end !== undefined ? t("events.period") : t("fields.start"), value: dateChip });
  }
  if (recurrenceChip !== undefined) {
    chips.push({ label: t("fields.recurrence"), value: recurrenceChip });
  }

  const referenceList = (
    groups: Array<readonly [string, string]>,
    className: string,
  ) => {
    const filled = groups.filter(([key]) => (references[key] ?? []).length > 0);
    if (filled.length === 0) return null;
    return (
      <dl className={`record-read-fields ${className}`}>
        {filled.map(([key, labelKey]) => (
          <div key={key} className="record-read-field">
            <dt>{t(labelKey)}</dt>
            <dd>
              <TitleLinks targets={references[key] ?? []} />
            </dd>
          </div>
        ))}
      </dl>
    );
  };

  return (
    <div>
      {fields.illustration !== undefined && fields.illustration !== "" && (
        <img
          src={fields.illustration}
          alt={props.record.title}
          className="mb-4 max-h-64 w-full rounded-md border border-border object-cover"
        />
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <span className="text-muted">{chip.label} </span>
              <span className="text-ink">{chip.value}</span>
            </span>
          ))}
        </div>
      )}
      {referenceList(originGroup, "mt-4")}
      {proseBlocks
        .filter(([, markdown]) => markdown !== "")
        .map(([labelKey, markdown]) => (
          <section key={labelKey} className="mt-8">
            <h2 className="font-display text-2xl text-ink">{t(labelKey)}</h2>
            <div className="mt-2">
              <ProseEditor markdown={markdown} readonly frame={false} />
            </div>
          </section>
        ))}
      {referenceList(bottomReferenceGroups, "mt-8")}
    </div>
  );
}

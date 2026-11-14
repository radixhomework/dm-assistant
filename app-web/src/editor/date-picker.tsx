import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarSettings } from "@dm/schemas";

export type ProseDate = { year: number; month?: number; day?: number };

/** Length of the selected month; without a selection, the longest month
 * keeps the day list meaningful. */
function monthLengthOf(
  months: Array<{ name: string; days: number }>,
  month: number | null,
): number {
  if (month !== null) {
    return months[month - 1]?.days ?? 30;
  }
  return Math.max(...months.map((entry) => entry.days));
}

/**
 * The prose date picker (records-editor decision 7): a floating panel fed
 * by the world calendar definition — named months, the day bounded by the
 * month's length, a signed year without year 0. Without a definition it
 * falls back to generic numeric months (1–12) and days (1–31). The panel
 * is viewport-anchored on the toolbar button that opened it.
 */
export function DatePickerPanel(props: {
  readonly definition: CalendarSettings | null;
  readonly anchor: { x: number; y: number };
  readonly onInsert: (date: ProseDate) => void;
  readonly onClose: () => void;
}) {
  const { t } = useTranslation();
  const months = props.definition?.months ?? null;
  const monthCount = months ? months.length : 12;
  const [yearDraft, setYearDraft] = useState<string>(
    String(props.definition?.currentYear ?? ""),
  );
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The definition may arrive after the panel opens: adopt its current
  // year as the default while the field is still untouched.
  useEffect(() => {
    if (props.definition && yearDraft === "") {
      setYearDraft(String(props.definition.currentYear));
    }
  }, [props.definition, yearDraft]);

  // The length of the selected month; without a selection, the longest
  // month keeps the day list meaningful. Generic 31 without a definition.
  const monthLength = months
    ? monthLengthOf(months, month)
    : 31;

  function onInsert(): void {
    if (yearDraft.trim() === "") {
      setError(t("editor.dateNeedsYear"));
      return;
    }
    const year = Math.trunc(Number(yearDraft));
    if (!Number.isFinite(year) || year === 0) {
      setError(t("editor.dateNoYearZero"));
      return;
    }
    const date: ProseDate = { year };
    if (month !== null) date.month = month;
    if (month !== null && day !== null) date.day = day;
    props.onInsert(date);
  }

  const left = Math.max(8, Math.min(props.anchor.x, window.innerWidth - 300));

  return (
    <div
      className="fixed z-50 flex w-72 flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-xl"
      style={{ left, top: props.anchor.y + 8 }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("editor.dateYear")}>
          <input
            type="number"
            aria-label={t("editor.dateYear")}
            value={yearDraft}
            onChange={(event) => setYearDraft(event.target.value)}
            className={`${inputClass} w-24`}
          />
        </Field>
        <Field label={t("editor.dateMonth")}>
          <select
            aria-label={t("editor.dateMonth")}
            value={month ?? ""}
            onChange={(event) => {
              const next = event.target.value === "" ? null : Number(event.target.value);
              setMonth(next);
              // A day beyond the new month's length falls off.
              if (day !== null && next !== null) {
                const length = months
                  ? months[next - 1]?.days ?? 30
                  : 31;
                setDay(day <= length ? day : null);
              }
            }}
            className={inputClass}
          >
            <option value="">—</option>
            {Array.from({ length: monthCount }).map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {months ? months[index].name : index + 1}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("editor.dateDay")}>
          <select
            aria-label={t("editor.dateDay")}
            value={day ?? ""}
            onChange={(event) =>
              setDay(event.target.value === "" ? null : Number(event.target.value))
            }
            className={inputClass}
          >
            <option value="">—</option>
            {Array.from({ length: monthLength }).map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {error && <p className="text-sm text-radish">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-surface"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onInsert}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-background transition-colors duration-200 hover:bg-accent"
        >
          {t("editor.dateInsert")}
        </button>
      </div>
    </div>
  );
}

function Field(props: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{props.label}</span>
      {props.children}
    </label>
  );
}

const inputClass = "rounded-md border border-border bg-background px-3 py-2 text-sm";

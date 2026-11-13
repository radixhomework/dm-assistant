import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useCalendarDefinition } from "../calendar/use-calendar.js";
import { Field, inputClass } from "./form.js";

type MonthDraft = { name: string; days: string };

type Draft = {
  months: MonthDraft[];
  weekDays: string;
  dayNames: string[];
  moonName: string;
  moonCycle: string;
};

function blankDraft(): Draft {
  return {
    months: [{ name: "", days: "30" }],
    weekDays: "7",
    dayNames: Array.from({ length: 7 }, () => ""),
    moonName: "",
    moonCycle: "29",
  };
}

function toDraft(definition: CalendarSettings): Draft {
  return {
    months: definition.months.map((month) => ({
      name: month.name,
      days: String(month.days),
    })),
    weekDays: String(definition.week.days),
    dayNames: [...definition.dayNames],
    moonName: definition.moon.name,
    moonCycle: String(definition.moon.cycleDays),
  };
}

/**
 * Admin editor of the world calendar definition (records-editor task
 * 5.2): months with their lengths, week length and weekday names, moon
 * cycle. Validates and persists through PATCH /api/admin/settings/
 * calendar; a saved definition invalidates the shared cache so the year
 * overview, the date picker and the date node refresh.
 */
export function CalendarAdminEditor() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const calendar = useCalendarDefinition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialize the editable copy once the definition (or its absence)
  // is known; after a save the draft already matches what was stored.
  useEffect(() => {
    if (calendar.calendar.data !== undefined && draft === null) {
      setDraft(calendar.definition ? toDraft(calendar.definition) : blankDraft());
    }
  }, [calendar.calendar.data, calendar.definition, draft]);

  if (calendar.isPending) return null;

  if (draft === null) return null;

  function onWeekDaysChange(raw: string): void {
    const days = Math.max(1, Math.min(30, Number(raw) || 1));
    setDraft((current) => {
      if (current === null) return current;
      const dayNames = [...current.dayNames];
      while (dayNames.length < days) dayNames.push("");
      while (dayNames.length > days) dayNames.pop();
      return { ...current, weekDays: String(days), dayNames };
    });
  }

  async function onSave(): Promise<void> {
    if (draft === null) return;
    setError(null);
    setSaved(false);
    const payload = {
      months: draft.months.map((month) => ({
        name: month.name,
        days: Number(month.days),
      })),
      week: { days: Number(draft.weekDays) },
      dayNames: draft.dayNames,
      moon: { name: draft.moonName, cycleDays: Number(draft.moonCycle) },
    };
    try {
      await api("/api/admin/settings/calendar", { method: "PATCH", body: payload });
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["calendar-settings"] });
    } catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink">{t("admin.calendar.title")}</h2>
      {saved && <p className="mt-1 text-sm text-primary">{t("admin.calendar.saved")}</p>}
      {error && <p className="mt-1 text-sm text-radish">{error}</p>}

      <div className="mt-3 flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-ink">{t("admin.calendar.months")}</p>
          <div className="mt-2 flex flex-col gap-2">
            {draft.months.map((month, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  aria-label={t("admin.calendar.monthName")}
                  placeholder={t("admin.calendar.monthName")}
                  value={month.name}
                  onChange={(event) =>
                    setDraft((current) => {
                      if (current === null) return current;
                      const months = [...current.months];
                      months[index] = { ...month, name: event.target.value };
                      return { ...current, months };
                    })
                  }
                  className={`${inputClass} flex-1`}
                />
                <input
                  aria-label={t("admin.calendar.monthDays")}
                  placeholder={t("admin.calendar.monthDays")}
                  type="number"
                  min={1}
                  value={month.days}
                  onChange={(event) =>
                    setDraft((current) => {
                      if (current === null) return current;
                      const months = [...current.months];
                      months[index] = { ...month, days: event.target.value };
                      return { ...current, months };
                    })
                  }
                  className={`${inputClass} w-24`}
                />
                <button
                  type="button"
                  aria-label={t("common.remove")}
                  onClick={() =>
                    setDraft((current) => {
                      if (current === null) return current;
                      if (current.months.length <= 1) return current;
                      return {
                        ...current,
                        months: current.months.filter((_, i) => i !== index),
                      };
                    })
                  }
                  className="rounded-md p-1.5 text-radish transition-colors duration-200 hover:bg-surface"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDraft((current) => {
                  if (current === null) return current;
                  return { ...current, months: [...current.months, { name: "", days: "30" }] };
                })
              }
              className="flex w-fit items-center gap-1 rounded-md border border-border px-2 py-1 text-sm text-muted transition-colors duration-200 hover:bg-surface"
            >
              <Plus className="size-4" aria-hidden />
              {t("admin.calendar.addMonth")}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Field label={t("admin.calendar.weekDays")}>
            <input
              type="number"
              min={1}
              max={30}
              value={draft.weekDays}
              onChange={(event) => onWeekDaysChange(event.target.value)}
              className={`${inputClass} w-24`}
            />
          </Field>
          <div>
            <p className="text-sm font-medium text-ink">{t("admin.calendar.dayNames")}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {draft.dayNames.map((name, index) => (
                <input
                  key={index}
                  aria-label={`${t("admin.calendar.dayNames")} ${index + 1}`}
                  value={name}
                  onChange={(event) =>
                    setDraft((current) => {
                      if (current === null) return current;
                      const dayNames = [...current.dayNames];
                      dayNames[index] = event.target.value;
                      return { ...current, dayNames };
                    })
                  }
                  className={`${inputClass} w-28`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Field label={t("admin.calendar.moonName")}>
            <input
              value={draft.moonName}
              onChange={(event) =>
                setDraft((current) => {
                  if (current === null) return current;
                  return { ...current, moonName: event.target.value };
                })
              }
              className={inputClass}
            />
          </Field>
          <Field label={t("admin.calendar.moonCycle")}>
            <input
              type="number"
              min={1}
              value={draft.moonCycle}
              onChange={(event) =>
                setDraft((current) => {
                  if (current === null) return current;
                  return { ...current, moonCycle: event.target.value };
                })
              }
              className={`${inputClass} w-24`}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => void onSave()}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm text-background transition-colors duration-200 hover:bg-accent"
        >
          {t("admin.calendar.save")}
        </button>
      </div>
    </section>
  );
}

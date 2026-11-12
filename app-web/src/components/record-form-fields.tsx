import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { Field, inputClass } from "./form.js";
import { classifyField, enumOptions } from "./field-classify.js";
import { ProseEditor } from "../editor/prose-editor.js";
import type { TemplateSchema } from "@dm/schemas";

type Fields = Record<string, unknown>;

/** Prose fields use the full rich-text editor (toolbar + mentions). */
function ProseControl(props: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  // No <label> wrapper: a label forwards clicks to the first control,
  // which here is the toolbar's Bold button — clicking the field label
  // would toggle bold.
  //
  // Only emit actual changes: TipTap normalizes the initial content and
  // fires onUpdate once on mount, which would inject empty-string keys.
  const lastEmitted = useRef(props.value);
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <ProseEditor
        markdown={props.value}
        onChange={(markdown) => {
          if (markdown === lastEmitted.current) return;
          lastEmitted.current = markdown;
          props.onChange(markdown);
        }}
      />
    </div>
  );
}

/** Currency-aware money: amount + GP/SP/CP (factor 10 between each). */
function MoneyControl(props: {
  readonly label: string;
  readonly value: { amount?: number; currency?: string };
  readonly onChange: (value: Fields) => void;
}) {
  const { t } = useTranslation();
  return (
    <Field label={props.label}>
      <div className="flex gap-2">
        <input
          type="number"
          step="any"
          value={props.value.amount ?? ""}
          onChange={(event) =>
            props.onChange({
              ...props.value,
              amount: event.target.value === "" ? undefined : Number(event.target.value),
            })
          }
          className={inputClass}
        />
        <select
          value={props.value.currency ?? "gp"}
          onChange={(event) => props.onChange({ ...props.value, currency: event.target.value })}
          className={inputClass}
        >
          <option value="gp">{t("money.gp")}</option>
          <option value="sp">{t("money.sp")}</option>
          <option value="cp">{t("money.cp")}</option>
        </select>
      </div>
    </Field>
  );
}

/**
 * Structured calendar date (era, signed year without year 0, month, day).
 * The calendar-aware picker arrives with the world-calendar controls.
 */
function DateControl(props: {
  readonly label: string;
  readonly value: { era?: string; year?: number; month?: number; day?: number };
  readonly onChange: (value: Fields) => void;
}) {
  const value = props.value;
  const set = (patch: Fields) => props.onChange({ ...value, ...patch });
  return (
    <Field label={props.label}>
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="era"
          value={value.era ?? ""}
          onChange={(event) => set({ era: event.target.value === "" ? undefined : event.target.value })}
          className={`${inputClass} w-28`}
        />
        <input
          type="number"
          placeholder="year"
          value={value.year ?? ""}
          onChange={(event) => set({ year: event.target.value === "" ? undefined : Number(event.target.value) })}
          className={inputClass}
        />
        <input
          type="number"
          placeholder="month"
          min={1}
          value={value.month ?? ""}
          onChange={(event) => set({ month: event.target.value === "" ? undefined : Number(event.target.value) })}
          className={`${inputClass} w-20`}
        />
        <input
          type="number"
          placeholder="day"
          min={1}
          value={value.day ?? ""}
          onChange={(event) => set({ day: event.target.value === "" ? undefined : Number(event.target.value) })}
          className={`${inputClass} w-20`}
        />
      </div>
    </Field>
  );
}

/** Recurrence: every N weeks / months / years, anchored on the start. */
function RecurrenceControl(props: {
  readonly label: string;
  readonly value: { unit?: string; interval?: number };
  readonly onChange: (value: Fields) => void;
}) {
  const { t } = useTranslation();
  return (
    <Field label={props.label}>
      <div className="flex gap-2">
        <select
          value={props.value.unit ?? "week"}
          onChange={(event) => props.onChange({ ...props.value, unit: event.target.value })}
          className={inputClass}
        >
          <option value="week">{t("recurrence.weeks")}</option>
          <option value="month">{t("recurrence.months")}</option>
          <option value="year">{t("recurrence.years")}</option>
        </select>
        <input
          type="number"
          min={1}
          value={props.value.interval ?? 1}
          onChange={(event) =>
            props.onChange({ ...props.value, interval: Number(event.target.value) || 1 })
          }
          className={inputClass}
        />
      </div>
    </Field>
  );
}

/**
 * The reusable Statistics block. Raw ability scores are entered; the SRD
 * modifier shows next to each input once it is not being edited.
 */
function StatisticsControl(props: {
  readonly label: string;
  readonly value: Fields;
  readonly onChange: (value: Fields) => void;
}) {
  const { t } = useTranslation();
  const [focusedAbility, setFocusedAbility] = useState<string | null>(null);
  const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
  const abilityLabels: Record<string, string> = {
    strength: t("stats.strength"),
    dexterity: t("stats.dexterity"),
    constitution: t("stats.constitution"),
    intelligence: t("stats.intelligence"),
    wisdom: t("stats.wisdom"),
    charisma: t("stats.charisma"),
  };
  const setAbility = (ability: string, raw: string) => {
    props.onChange({
      ...props.value,
      [ability]: raw === "" ? undefined : Number(raw),
    });
  };
  const modifier = (ability: string) => {
    const score = props.value[ability];
    if (typeof score !== "number") return "";
    return `(${Math.floor((score - 10) / 2) >= 0 ? "+" : ""}${Math.floor((score - 10) / 2)})`;
  };

  const setPart = (key: string, value: unknown) => props.onChange({ ...props.value, [key]: value });
  const numberPart = (key: string) => {
    const value = props.value[key];
    return typeof value === "number" ? value : "";
  };
  const textPart = (key: string) => {
    const value = props.value[key];
    return typeof value === "string" ? value : "";
  };
  // hp is the nested { average, formula } object of the statistics value.
  const hp = props.value.hp as { average?: number; formula?: string } | undefined;

  return (
    <Field label={props.label}>
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {abilities.map((ability) => (
            <label key={ability} className="flex flex-col gap-1 text-sm">
              {abilityLabels[ability]}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={typeof props.value[ability] === "number" ? props.value[ability] : ""}
                  onFocus={() => setFocusedAbility(ability)}
                  onBlur={() => setFocusedAbility(null)}
                  onChange={(event) => setAbility(ability, event.target.value)}
                  className={`${inputClass} w-20`}
                />
                {focusedAbility !== ability && modifier(ability) && (
                  <span className="text-sm text-muted">{modifier(ability)}</span>
                )}
              </div>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Field label={t("stats.ac")}>
            <input
              type="number"
              value={numberPart("ac")}
              onChange={(event) => setPart("ac", event.target.value === "" ? undefined : Number(event.target.value))}
              className={`${inputClass} w-20`}
            />
          </Field>
          <Field label={t("stats.passivePerception")}>
            <input
              type="number"
              value={numberPart("passivePerception")}
              onChange={(event) =>
                setPart("passivePerception", event.target.value === "" ? undefined : Number(event.target.value))
              }
              className={`${inputClass} w-20`}
            />
          </Field>
          <Field label={t("stats.initiative")}>
            <input
              type="number"
              value={numberPart("initiative")}
              onChange={(event) =>
                setPart("initiative", event.target.value === "" ? undefined : Number(event.target.value))
              }
              className={`${inputClass} w-20`}
            />
          </Field>
          <Field label={t("stats.darkvision")}>
            <input
              type="number"
              value={numberPart("darkvision")}
              onChange={(event) =>
                setPart("darkvision", event.target.value === "" ? undefined : Number(event.target.value))
              }
              className={`${inputClass} w-20`}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("stats.hpAverage")}>
            <input
              type="number"
              value={typeof hp?.average === "number" ? hp.average : ""}
              onChange={(event) =>
                setPart("hp", {
                  ...hp,
                  average: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
              className={inputClass}
            />
          </Field>
          <Field label={t("stats.hpFormula")}>
            <input
              value={hp?.formula ?? ""}
              onChange={(event) =>
                setPart("hp", {
                  ...hp,
                  formula: event.target.value,
                })
              }
              className={inputClass}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Field label={t("stats.alignment")}>
            <input
              value={textPart("alignment")}
              onChange={(event) => setPart("alignment", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("stats.creatureType")}>
            <input
              value={textPart("creatureType")}
              onChange={(event) => setPart("creatureType", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={t("stats.size")}>
            <select
              value={textPart("size")}
              onChange={(event) => setPart("size", event.target.value === "" ? undefined : event.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {["tiny", "small", "medium", "large", "huge", "gargantuan"].map((size) => (
                <option key={size} value={size}>
                  {t(`enums.size.${size}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Field>
  );
}

/**
 * Generic form renderer: one control per template field, in template
 * order, driven by the template schema (template-schemas capability).
 * Reference fields live in the relationships table and are rendered by
 * their own controls (phase 6); they never appear in fields JSONB.
 */
export function RecordFormFields(props: {
  readonly schema: TemplateSchema;
  readonly fields: Fields;
  readonly onChange: (fields: Fields) => void;
}) {
  const { t } = useTranslation();
  const shape = (props.schema.fields as unknown as {
    shape: Record<string, unknown>;
  }).shape;

  const setField = (key: string, value: unknown) => props.onChange({ ...props.fields, [key]: value });

  const controls: Array<ReturnType<typeof Field>> = [];
  for (const [key, schema] of Object.entries(shape)) {
    const kind = classifyField(key, schema);
    const label = t(`fields.${key}`);
    const value = props.fields[key];
    const asString = typeof value === "string" ? value : "";
    const asObject = (value ?? {}) as Fields;

    switch (kind) {
      case "prose":
        controls.push(
          <ProseControl key={key} label={label} value={asString} onChange={(v) => setField(key, v)} />,
        );
        break;
      case "money":
        controls.push(<MoneyControl key={key} label={label} value={asObject} onChange={(v) => setField(key, v)} />);
        break;
      case "calendarDate":
        controls.push(<DateControl key={key} label={label} value={asObject} onChange={(v) => setField(key, v)} />);
        break;
      case "recurrence":
        controls.push(
          <RecurrenceControl key={key} label={label} value={asObject} onChange={(v) => setField(key, v)} />,
        );
        break;
      case "statistics":
        controls.push(
          <StatisticsControl key={key} label={label} value={asObject} onChange={(v) => setField(key, v)} />,
        );
        break;
      case "enum": {
        const options = enumOptions(schema) ?? [];
        controls.push(
          <Field key={key} label={label}>
            <select
              name={key}
              value={asString}
              onChange={(event) => setField(key, event.target.value === "" ? undefined : event.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {t(`enums.${key}.${option}`, {
                    defaultValue: option.replaceAll("_", " "),
                  })}
                </option>
              ))}
            </select>
          </Field>,
        );
        break;
      }
      case "order":
        controls.push(
          <Field key={key} label={label}>
            <input
              name={key}
              type="number"
              min={0}
              value={typeof value === "number" ? value : ""}
              onChange={(event) =>
                setField(key, event.target.value === "" ? undefined : Number(event.target.value))
              }
              className={`${inputClass} w-24`}
            />
          </Field>,
        );
        break;
      case "asset":
      case "text":
        controls.push(
          <Field key={key} label={label}>
            <input
              name={key}
              value={asString}
              onChange={(event) => setField(key, event.target.value)}
              className={inputClass}
            />
          </Field>,
        );
        break;
    }
  }

  return <div className="flex flex-col gap-4">{controls}</div>;
}

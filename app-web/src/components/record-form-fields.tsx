import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { Field, inputClass } from "./form.js";
import { classifyField, enumOptions } from "./field-classify.js";
import { ProseEditor } from "../editor/prose-editor.js";
import { ReferenceInput } from "./reference-input.js";
import { diceAverage } from "../editor/dice.js";
import { SRD_SKILLS } from "../stats/srd-skills.js";
import { CONDITIONS, DAMAGE_TYPES } from "../stats/srd-lists.js";
import { useCalendarDefinition } from "../calendar/use-calendar.js";
import {
  abilityModifier,
  alignmentValues,
  creatureTypeValues,
  type CalendarSettings,
  type TemplateSchema,
} from "@dm/schemas";

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
              // The GP default applies as soon as the amount exists.
              currency: event.target.value === "" ? props.value.currency : "gp",
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

/** Length of the selected month; without a selection, the longest month
 * keeps the day select meaningful. */
function monthLengthOf(
  definition: CalendarSettings,
  month: number | undefined,
): number {
  if (month !== undefined) {
    return definition.months[month - 1]?.days ?? 1;
  }
  return Math.max(...definition.months.map((entry) => entry.days));
}

/**
 * Structured calendar date (era, signed year without year 0, month, day),
 * fed by the world calendar definition when one exists: the month becomes
 * a named select and the day input caps at the month's length. Without a
 * definition it falls back to numeric month/day inputs.
 */
function DateControl(props: {
  readonly label: string;
  readonly value: { era?: string; year?: number; month?: number; day?: number };
  readonly onChange: (value: Fields) => void;
}) {
  const { t } = useTranslation();
  const { definition } = useCalendarDefinition();
  const value = props.value;
  const set = (patch: Fields) => props.onChange({ ...value, ...patch });
  const monthLength = definition
    ? monthLengthOf(definition, value.month)
    : undefined;
  return (
    <Field label={props.label}>
      <div className="flex flex-wrap gap-2">
        <input
          placeholder={t("record.era")}
          value={value.era ?? ""}
          onChange={(event) => set({ era: event.target.value === "" ? undefined : event.target.value })}
          className={`${inputClass} w-28`}
        />
        <input
          type="number"
          placeholder={t("record.year")}
          value={value.year ?? ""}
          onChange={(event) => set({ year: event.target.value === "" ? undefined : Number(event.target.value) })
          }
          className={inputClass}
        />
        {definition ? (
          <select
            aria-label={t("record.month")}
            value={value.month ?? ""}
            onChange={(event) =>
              set({ month: event.target.value === "" ? undefined : Number(event.target.value) })
            }
            className={inputClass}
          >
            <option value="">—</option>
            {definition.months.map((month, index) => (
              <option key={month.name} value={index + 1}>
                {month.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            placeholder={t("record.month")}
            min={1}
            value={value.month ?? ""}
            onChange={(event) => set({ month: event.target.value === "" ? undefined : Number(event.target.value) })}
            className={`${inputClass} w-20`}
          />
        )}
        {definition ? (
          <select
            aria-label={t("record.day")}
            value={value.day ?? ""}
            onChange={(event) =>
              set({ day: event.target.value === "" ? undefined : Number(event.target.value) })
            }
            className={inputClass}
          >
            <option value="">—</option>
            {Array.from({ length: monthLength ?? 1 }).map((_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            placeholder={t("record.day")}
            min={1}
            value={value.day ?? ""}
            onChange={(event) => set({ day: event.target.value === "" ? undefined : Number(event.target.value) })}
            className={`${inputClass} w-20`}
          />
        )}
      </div>
    </Field>
  );
}

/**
 * Recurrence: opt-in through the checkbox (none by default); when
 * checked, the event repeats every N weeks / months / years, anchored
 * on the start. Unchecking clears the recurrence value entirely (the
 * undefined keys serialize out of the payload).
 */
function RecurrenceControl(props: {
  readonly label: string;
  readonly value: { unit?: string; interval?: number };
  readonly onChange: (value: Fields) => void;
}) {
  const { t } = useTranslation();
  const recurring = props.value.unit !== undefined || props.value.interval !== undefined;
  // No <label> wrapper (Field nests labels): the checkbox keeps its own
  // accessible name.
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(event) =>
            props.onChange(
              event.target.checked
                ? { unit: "week", interval: 1 }
                : { unit: undefined, interval: undefined },
            )
          }
        />
        {t("record.recurring")}
      </label>
      {recurring && (
        <div className="flex gap-2">
          <select
            aria-label={t("recurrence.unit")}
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
            aria-label={t("recurrence.interval")}
            min={1}
            value={props.value.interval ?? 1}
            onChange={(event) =>
              props.onChange({ ...props.value, interval: Number(event.target.value) || 1 })
            }
            className={inputClass}
          />
        </div>
      )}
    </div>
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
  const masteryFlags = (key: "checksMastery" | "savesMastery") =>
    (props.value[key] ?? {}) as Record<string, boolean | undefined>;
  const masteryFlag = (key: "checksMastery" | "savesMastery", ability: string) =>
    masteryFlags(key)[ability] === true;
  const setMastery = (
    key: "checksMastery" | "savesMastery",
    ability: string,
    checked: boolean,
  ): void => {
    setPart(key, { ...masteryFlags(key), [ability]: checked });
  };
  const skills = (props.value.skills ?? []) as Array<{
    rowId: string;
    name: string;
    ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
  }>;



  return (
    <Field label={props.label}>
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
        {/* Pseudo-table: characteristics / values / check mastery / save
         * mastery, all aligned on the same six columns. */}
        <div className="grid grid-cols-7 items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-muted">{t("stats.characteristics")}</span>
          {abilities.map((ability) => (
            <span key={`label-${ability}`} className="text-center text-xs uppercase tracking-wide text-muted">
              {t(`stats.abbr.${ability}`)}
            </span>
          ))}
          <span className="text-muted">{t("stats.values")}</span>
          {abilities.map((ability) => (
            <input
              key={`score-${ability}`}
              type="number"
              aria-label={abilityLabels[ability]}
              value={typeof props.value[ability] === "number" ? props.value[ability] : ""}
              onChange={(event) => setAbility(ability, event.target.value)}
              className={`${inputClass} w-full px-2 py-1 text-center`}
            />
          ))}
          <span className="text-muted">{t("stats.checksMastery")}</span>
          {abilities.map((ability) => (
            <label key={`check-${ability}`} className="flex justify-center">
              <input
                type="checkbox"
                aria-label={`${t("stats.abilityChecks")} ${abilityLabels[ability]}`}
                checked={masteryFlag("checksMastery", ability)}
                onChange={(event) => setMastery("checksMastery", ability, event.target.checked)}
              />
            </label>
          ))}
          <span className="text-muted">{t("stats.savesMastery")}</span>
          {abilities.map((ability) => (
            <label key={`save-${ability}`} className="flex justify-center">
              <input
                type="checkbox"
                aria-label={`${t("stats.savesMastery")} ${abilityLabels[ability]}`}
                checked={masteryFlag("savesMastery", ability)}
                onChange={(event) => setMastery("savesMastery", ability, event.target.checked)}
              />
            </label>
          ))}
        </div>
        {/* AC, passive perception, initiative, proficiency bonus */}
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
          <Field label={t("stats.proficiencyBonus")}>
            <input
              type="number"
              value={typeof props.value.proficiencyBonus === "number" ? props.value.proficiencyBonus : ""}
              onChange={(event) =>
                setPart("proficiencyBonus", event.target.value === "" ? undefined : Number(event.target.value))
              }
              className={`${inputClass} w-20`}
            />
          </Field>
        </div>
        {/* HP formula — the average is computed automatically */}
        <Field label={t("stats.hpFormula")}>
          <div className="flex items-center gap-2">
            <input
              value={hp?.formula ?? ""}
              onChange={(event) => {
                const formula = event.target.value;
                const average = formula.trim() === "" ? undefined : diceAverage(formula);
                setPart("hp", { formula, average: average ?? 0 });
              }}
              className={inputClass}
            />
            {hp?.formula !== undefined && diceAverage(hp.formula) !== null && (
              <span className="text-sm text-muted">
                {t("stats.hpAverage")} : {diceAverage(hp.formula)}
              </span>
            )}
          </div>
        </Field>
        {/* Speeds */}
        {(() => {
          const speed = (props.value.speed ?? {}) as Record<string, number | undefined>;
          const speeds: Array<readonly [string, string]> = [
            ["walk", t("stats.speedWalk")],
            ["fly", t("stats.speedFly")],
            ["swim", t("stats.speedSwim")],
            ["climb", t("stats.speedClimb")],
            ["burrow", t("stats.speedBurrow")],
          ];
          const setSpeed = (key: string, raw: string): void => {
            setPart("speed", {
              ...speed,
              [key]: raw === "" ? undefined : Number(raw),
            });
          };
          return (
            <Field label={t("stats.speed")}>
              <div className="flex flex-wrap gap-2">
                {speeds.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1 text-sm">
                    <span className="text-muted">{label}</span>
                    <input
                      type="number"
                      aria-label={`${t("stats.speed")} ${label}`}
                      value={typeof speed[key] === "number" ? speed[key] : ""}
                      onChange={(event) => setSpeed(key, event.target.value)}
                      className={`${inputClass} w-20`}
                    />
                  </label>
                ))}
              </div>
            </Field>
          );
        })()}
        {/* Senses */}
        {(() => {
          const senses = (props.value.senses ?? {}) as Record<string, number | undefined>;
          const senseInputs: Array<readonly [string, string]> = [
            ["darkvision", t("stats.darkvision")],
            ["blindsight", t("stats.blindsight")],
            ["truesight", t("stats.truesight")],
            ["tremorsense", t("stats.tremorsense")],
          ];
          const setSense = (key: string, raw: string): void => {
            setPart("senses", {
              ...senses,
              [key]: raw === "" ? undefined : Number(raw),
            });
          };
          return (
            <Field label={t("stats.senses")}>
              <div className="flex flex-wrap gap-2">
                {senseInputs.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1 text-sm">
                    <span className="text-muted">{label}</span>
                    <input
                      type="number"
                      aria-label={`${t("stats.senses")} ${label}`}
                      value={typeof senses[key] === "number" ? senses[key] : ""}
                      onChange={(event) => setSense(key, event.target.value)}
                      className={`${inputClass} w-20`}
                    />
                  </label>
                ))}
              </div>
            </Field>
          );
        })()}
        {/* Alignment, creature type, size */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label={t("stats.alignment")}>
            <select
              value={textPart("alignment")}
              onChange={(event) =>
                setPart("alignment", event.target.value === "" ? undefined : event.target.value)
              }
              className={inputClass}
            >
              <option value="">—</option>
              {alignmentValues.map((value) => (
                <option key={value} value={value}>
                  {t(`enums.alignment.${value}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("stats.creatureType")}>
            <select
              value={textPart("creatureType")}
              onChange={(event) =>
                setPart("creatureType", event.target.value === "" ? undefined : event.target.value)
              }
              className={inputClass}
            >
              <option value="">—</option>
              {creatureTypeValues.map((value) => (
                <option key={value} value={value}>
                  {t(`enums.creatureType.${value}`)}
                </option>
              ))}
            </select>
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
        {/* Skills: mastered skills picked from the SRD list — the modifier
         * computes live (ability modifier + proficiency bonus). */}
        <Field label={t("stats.skills")}>
          <div className="flex flex-col gap-1">
            {skills.map((skill) => {
              const score = props.value[skill.ability];
              const base =
                typeof score === "number" ? abilityModifier(score) : 0;
              const prof =
                typeof props.value.proficiencyBonus === "number"
                  ? props.value.proficiencyBonus
                  : 0;
              const total = base + prof;
              return (
                <div key={skill.rowId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-ink">{skill.name}</span>
                  <span className="text-muted">
                    {t(`stats.${skill.ability}`)} · {t("stats.proficiencyBonus")}{" "}
                    {prof}
                  </span>
                  <span className="font-semibold text-ink">
                    {total >= 0 ? "+" : ""}
                    {total}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPart(
                        "skills",
                        skills.filter((entry) => entry.rowId !== skill.rowId),
                      )
                    }
                    className="text-sm text-radish transition-colors duration-200 hover:underline"
                  >
                    {t("common.remove")}
                  </button>
                </div>
              );
            })}
            {(() => {
              const available = SRD_SKILLS.filter(
                (srd) => !skills.some((skill) => skill.name === srd.name),
              );
              if (available.length === 0) return null;
              return (
                <select
                  aria-label={t("stats.addSkill")}
                  value=""
                  onChange={(event) => {
                    const picked = SRD_SKILLS.find((s) => s.name === event.target.value);
                    if (!picked) return;
                    setPart("skills", [
                      ...skills,
                      {
                        rowId: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        name: picked.name,
                        ability: picked.ability,
                      },
                    ]);
                  }}
                  className={inputClass}
                >
                  <option value="">{t("stats.addSkill")}</option>
                  {available.map((srd) => (
                    <option key={srd.name} value={srd.name}>
                      {srd.name} ({t(`stats.${srd.ability}`)})
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>
        </Field>
        {/* Damage lists: static SRD lists (damage types; immunities also
         * accept the conditions). */}
        {([
          ["resistances", t("stats.resistances"), DAMAGE_TYPES],
          ["vulnerabilities", t("stats.vulnerabilities"), DAMAGE_TYPES],
        ] as const).map(([key, label, entries]) => (
          <Field key={key} label={label}>
            <div className="flex flex-col gap-1">
              {((props.value[key] ?? []) as string[]).map((entry) => (
                <span
                  key={entry}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {t(`enums.damageTypes.${entry}`, { defaultValue: entry })}
                  <button
                    type="button"
                    onClick={() =>
                      setPart(
                        key,
                        ((props.value[key] ?? []) as string[]).filter(
                          (candidate) => candidate !== entry,
                        ),
                      )
                    }
                    className="text-sm text-radish transition-colors duration-200 hover:underline"
                  >
                    {t("common.remove")}
                  </button>
                </span>
              ))}
              {(() => {
                const current = (props.value[key] ?? []) as string[];
                const available = entries.filter(
                  (candidate) => !current.includes(candidate.key),
                );
                if (available.length === 0) return null;
                return (
                  <select
                    aria-label={label}
                    value=""
                    onChange={(event) => {
                      if (event.target.value !== "") {
                        setPart(key, [...current, event.target.value]);
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="">{t("stats.damageAdd")}</option>
                    {available.map((candidate) => (
                      <option key={candidate.key} value={candidate.key}>
                        {t(`enums.damageTypes.${candidate.key}`, { defaultValue: candidate.key })}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          </Field>
        ))}
        <Field label={t("stats.immunities")}>
          <div className="flex flex-col gap-1">
            {((props.value.immunities ?? []) as string[]).map((entry) => (
              <span
                key={entry}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {t(`enums.damageTypes.${entry}`, { defaultValue: entry })}
                <button
                  type="button"
                  onClick={() =>
                    setPart(
                      "immunities",
                      ((props.value.immunities ?? []) as string[]).filter(
                        (candidate) => candidate !== entry,
                      ),
                    )
                  }
                  className="text-sm text-radish transition-colors duration-200 hover:underline"
                >
                  {t("common.remove")}
                </button>
              </span>
            ))}
            <div className="flex flex-wrap gap-2">
              {([
                [DAMAGE_TYPES, "damageTypes", t("stats.damageTypes")],
                [CONDITIONS, "conditions", t("stats.conditions")],
              ] as const).map(([entries, namespace, listLabel]) => {
                const available = entries.filter(
                  (candidate) =>
                    !((props.value.immunities ?? []) as string[]).includes(
                      candidate.key,
                    ),
                );
                if (available.length === 0) return null;
                return (
                  <select
                    key={available[0].key}
                    aria-label={`${t("stats.immunities")} — ${listLabel}`}
                    value=""
                    onChange={(event) => {
                      if (event.target.value !== "") {
                        setPart(
                          "immunities",
                          [
                            ...((props.value.immunities ?? []) as string[]),
                            event.target.value,
                          ],
                        );
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="">{t("stats.damageAdd")}</option>
                    {available.map((candidate) => (
                      <option key={candidate.key} value={candidate.key}>
                        {t(`enums.${namespace}.${candidate.key}`, {
                          defaultValue: candidate.key,
                        })}
                      </option>
                    ))}
                  </select>
                );
              })}
            </div>
          </div>
        </Field>
      </div>
    </Field>
  );
}

/**
 * Generic form renderer: one control per template field, in template
 * order, driven by the template schema (template-schemas capability).
 * Reference fields live in the relationships table: they render below
 * the schema fields with their own attach/detach controls (phase 6).
 */
export function RecordFormFields(props: {
  readonly schema: TemplateSchema;
  readonly fields: Fields;
  readonly onChange: (fields: Fields) => void;
  readonly references?: Record<string, Array<{ slug: string; title: string }>>;
  readonly onAttachReference?: (field: string, targetSlug: string) => void;
  readonly onDetachReference?: (field: string, targetSlug: string) => void;
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

  const referenceEntries = Object.entries(props.schema.references);
  return (
    <div className="flex flex-col gap-4">
      {controls}
      {referenceEntries.map(([field, declaration]) => {
        const current = props.references?.[field] ?? [];
        return (
          <Field key={field} label={t(`fields.${field}`)}>
            <div className="flex flex-col gap-1">
              {current.map((target) => (
                <span
                  key={target.slug}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {target.title}
                  {props.onDetachReference && (
                    <button
                      type="button"
                      onClick={() => props.onDetachReference?.(field, target.slug)}
                      className="text-sm text-radish transition-colors duration-200 hover:underline"
                    >
                      {t("common.remove")}
                    </button>
                  )}
                </span>
              ))}
              {props.onAttachReference && (
                <ReferenceInput
                  targetType={declaration.target}
                  placeholder={t("record.referenceSearch")}
                  onPick={(slug) => props.onAttachReference?.(field, slug)}
                />
              )}
            </div>
          </Field>
        );
      })}
    </div>
  );
}

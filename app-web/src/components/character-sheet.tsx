import { useTranslation } from "react-i18next";
import { abilityModifier } from "@dm/schemas";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";
import type { Statistics } from "@dm/schemas";

/**
 * The bespoke sheet for "Characters and entities" (records-editor 9.2 —
 * the DM review gate before batching the remaining templates): the
 * statistics block rendered as a proper stat strip, the typed
 * references as labeled link groups, and the prose blocks through the
 * readonly editor (mention links resolved, dead links marked).
 */

function LabeledProse(props: { readonly label: string; readonly markdown: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl text-ink">{props.label}</h2>
      <div className="mt-2">
        <ProseEditor markdown={props.markdown} readonly frame={false} />
      </div>
    </section>
  );
}

function ReferenceGroup(props: {
  readonly label: string;
  readonly targets: Array<{ slug: string; title: string }>;
}) {
  return (
    <div className="record-read-field">
      <dt>{props.label}</dt>
      <dd>
        <TitleLinks targets={props.targets} />
      </dd>
    </div>
  );
}

function StatisticsBlock(props: { readonly statistics: Statistics }) {
  const { t } = useTranslation();
  const stats = props.statistics;
  const prof = stats.proficiencyBonus ?? 0;
  const abilities: Array<readonly [string, number | undefined]> = [
    ["strength", stats.strength],
    ["dexterity", stats.dexterity],
    ["constitution", stats.constitution],
    ["intelligence", stats.intelligence],
    ["wisdom", stats.wisdom],
    ["charisma", stats.charisma],
  ];
  // MOD = pure ability modifier; JS = MOD + proficiency when the save is
  // mastered (records-editor — SRD stat-block convention).
  const modifierOf = (score: number | undefined): number | null =>
    score === undefined ? null : abilityModifier(score);
  const saveOf = (key: string, mod: number | null): number | null =>
    mod === null ? null : mod + (stats.savesMastery?.[key as keyof typeof stats.savesMastery] === true ? prof : 0);

  const speed = stats.speed;
  const speedParts: string[] = speed
    ? (
        [
          ["speedWalk", speed.walk],
          ["speedFly", speed.fly],
          ["speedSwim", speed.swim],
          ["speedClimb", speed.climb],
          ["speedBurrow", speed.burrow],
        ] as const
      )
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${value} m (${t(`stats.${key}`)})`)
    : [];
  const senses: string[] = [
    stats.darkvision !== undefined
      ? `${t("stats.darkvision")} ${stats.darkvision} m`
      : "",
    stats.passivePerception !== undefined
      ? `${t("stats.passivePerception")} ${stats.passivePerception}`
      : "",
  ].filter(Boolean);

  return (
    <section className="mt-8">
      <p className="text-sm italic text-muted">
        {[stats.creatureType, stats.alignment]
          .filter(Boolean)
          .join(", ")}
        {stats.size !== undefined
          ? ` · ${t("stats.size")} ${t(`enums.size.${stats.size}`)}`
          : ""}
      </p>
      <div className="mt-2 flex flex-col gap-1 rounded-md border border-border bg-surface p-3 text-sm">
        <p>
          <span className="font-semibold text-ink">{t("stats.ac")}</span>{" "}
          {stats.ac ?? "—"}
          {stats.initiative !== undefined && (
            <>
              {" — "}
              <span className="font-semibold text-ink">{t("stats.initiative")}</span>{" "}
              {stats.initiative >= 0 ? "+" : ""}
              {stats.initiative}
            </>
          )}
        </p>
        {stats.hp !== undefined && (
          <p>
            <span className="font-semibold text-ink">{t("stats.hpShort")}</span>{" "}
            {stats.hp.average} ({stats.hp.formula})
          </p>
        )}
        {speedParts.length > 0 && (
          <p>
            <span className="font-semibold text-ink">{t("stats.speed")}</span>{" "}
            {speedParts.join(", ")}
          </p>
        )}
        <table className="mt-1 w-full max-w-xl border-collapse text-center">
          <thead>
            <tr className="text-xs uppercase text-muted">
              <th />
              <th>{t("stats.modHeader")}</th>
              <th>{t("stats.saveHeader")}</th>
            </tr>
          </thead>
          <tbody>
            {abilities.map(([key, score]) => {
              const mod = modifierOf(score);
              const save = saveOf(key, mod);
              return (
                <tr key={key} className="border-t border-border">
                  <th scope="row" className="text-left font-semibold text-ink">
                    {t(`stats.abbr.${key}`)} {score ?? "—"}
                  </th>
                  <td className="text-ink">{mod === null ? "—" : `+${mod}`}</td>
                  <td className="text-ink">{save === null ? "—" : `+${save}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(stats.skills ?? []).length > 0 && (
          <p>
            <span className="font-semibold text-ink">{t("stats.skills")}</span>{" "}
            {(stats.skills ?? [])
              .map(
                (skill) =>
                  `${skill.name} ${skill.modifier >= 0 ? "+" : ""}${skill.modifier}`,
              )
              .join(", ")}
          </p>
        )}
        {(stats.vulnerabilities ?? []).length > 0 && (
          <p>
            <span className="font-semibold text-ink">{t("stats.vulnerabilities")}</span>{" "}
            {(stats.vulnerabilities ?? []).join(", ")}
          </p>
        )}
        {(stats.resistances ?? []).length > 0 && (
          <p>
            <span className="font-semibold text-ink">{t("stats.resistances")}</span>{" "}
            {(stats.resistances ?? []).join(", ")}
          </p>
        )}
        {(stats.immunities ?? []).length > 0 && (
          <p>
            <span className="font-semibold text-ink">{t("stats.immunities")}</span>{" "}
            {(stats.immunities ?? []).join(", ")}
          </p>
        )}
        {senses.length > 0 && (
          <p>
            <span className="font-semibold text-ink">{t("stats.senses")}</span>{" "}
            {senses.join(" ; ")}
          </p>
        )}
      </div>
    </section>
  );
}

export function CharacterSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    gender?: string;
    physical_traits?: string;
    statistics?: Statistics;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};
  const gender =
    fields.gender !== undefined
      ? t(`enums.gender.${fields.gender}`, { defaultValue: fields.gender })
      : undefined;

  const referenceGroups: Array<readonly [string, string]> = [
    ["origin", "fields.origin"],
    ["species", "fields.species"],
    ["classes", "fields.classes"],
    ["languages", "fields.languages"],
    ["characters", "fields.characters"],
    ["beliefs", "fields.beliefs"],
    ["organizations", "fields.organizations"],
    ["knowledge", "fields.knowledge"],
    ["works", "fields.works"],
  ];

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.physical_traits", fields.physical_traits ?? ""],
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

  return (
    <div>
      {gender !== undefined && (
        <p className="text-sm italic text-muted">
          {t("fields.gender")} : {gender}
        </p>
      )}
      {fields.statistics !== undefined && (
        <StatisticsBlock statistics={fields.statistics} />
      )}
      {referenceGroups.some(([key]) => (references[key] ?? []).length > 0) && (
        <dl className="record-read-fields mt-4">
          {referenceGroups
            .filter(([key]) => (references[key] ?? []).length > 0)
            .map(([key, labelKey]) => (
              <ReferenceGroup
                key={key}
                label={t(labelKey)}
                targets={references[key] ?? []}
              />
            ))}
        </dl>
      )}
      {proseBlocks
        .filter(([, markdown]) => markdown !== "")
        .map(([labelKey, markdown]) => (
          <LabeledProse key={labelKey} label={t(labelKey)} markdown={markdown} />
        ))}
    </div>
  );
}

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

type StatRow = { readonly label: string; readonly value: React.ReactNode };

function AbilityCell(props: {
  readonly label: string;
  readonly score: number | undefined;
}) {
  const modifier =
    props.score === undefined
      ? null
      : abilityModifier(props.score);
  const modifierText =
    modifier === null ? "" : ` (${modifier >= 0 ? "+" : ""}${modifier})`;
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-center">
      <p className="text-xs uppercase tracking-wide text-muted">{props.label}</p>
      <p className="text-lg text-ink">
        {props.score ?? "—"}
        {modifierText && (
          <span className="text-sm text-muted">{modifierText}</span>
        )}
      </p>
    </div>
  );
}

function StatChip(props: { readonly label: string; readonly value: React.ReactNode }) {
  if (props.value === undefined || props.value === null || props.value === "") {
    return null;
  }
  return (
    <span className="rounded-md border border-border bg-background px-2 py-1 text-sm">
      <span className="text-muted">{props.label} </span>
      <span className="text-ink">{props.value}</span>
    </span>
  );
}

function LabeledProse(props: { readonly label: string; readonly markdown: string }) {
  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold text-ink">{props.label}</h3>
      <div className="mt-1">
        <ProseEditor markdown={props.markdown} readonly />
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
  const abilities = [
    ["strength", stats.strength],
    ["dexterity", stats.dexterity],
    ["constitution", stats.constitution],
    ["intelligence", stats.intelligence],
    ["wisdom", stats.wisdom],
    ["charisma", stats.charisma],
  ] as const;
  const speed = stats.speed;
  const speeds: Array<StatRow> = speed
    ? [
        { label: t("stats.speedWalk"), value: speed.walk },
        { label: t("stats.speedFly"), value: speed.fly },
        { label: t("stats.speedSwim"), value: speed.swim },
        { label: t("stats.speedClimb"), value: speed.climb },
        { label: t("stats.speedBurrow"), value: speed.burrow },
      ]
    : [];
  const resistances = [
    { label: t("stats.vulnerabilities"), values: stats.vulnerabilities ?? [] },
    { label: t("stats.resistances"), values: stats.resistances ?? [] },
    { label: t("stats.immunities"), values: stats.immunities ?? [] },
  ];
  return (
    <section className="mt-4">
      <h3 className="text-sm font-semibold text-ink">{t("fields.statistics")}</h3>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {abilities.map(([key, score]) => (
          <AbilityCell key={key} label={t(`stats.${key}`)} score={score} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <StatChip label={t("stats.ac")} value={stats.ac} />
        <StatChip label={t("stats.initiative")} value={stats.initiative} />
        <StatChip
          label={t("stats.hpAverage")}
          value={
            stats.hp ? `${stats.hp.average} (${stats.hp.formula})` : undefined
          }
        />
        <StatChip label={t("stats.darkvision")} value={stats.darkvision} />
        <StatChip
          label={t("stats.passivePerception")}
          value={stats.passivePerception}
        />
        {speeds
          .filter((row) => row.value !== undefined)
          .map((row) => (
            <StatChip key={row.label} label={row.label} value={row.value} />
          ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <StatChip label={t("stats.creatureType")} value={stats.creatureType} />
        <StatChip
          label={t("stats.size")}
          value={
            stats.size !== undefined
              ? t(`enums.size.${stats.size}`, {
                  defaultValue: stats.size,
                })
              : undefined
          }
        />
        <StatChip label={t("stats.alignment")} value={stats.alignment} />
        {resistances
          .filter((group) => group.values.length > 0)
          .map((group) => (
            <StatChip
              key={group.label}
              label={group.label}
              value={group.values.join(", ")}
            />
          ))}
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
      <div className="flex flex-wrap gap-2">
        <StatChip label={t("fields.gender")} value={gender} />
      </div>
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

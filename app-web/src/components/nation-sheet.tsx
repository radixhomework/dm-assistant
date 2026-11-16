import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Nations" (world → Society): the illustration as
 * a banner, the population and political system as chips, the capital as
 * the structural reference, the two descriptions as headed frameless
 * prose sections, then the associative references just before the
 * scaffold's backlinks section.
 */
export function NationSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    population?: string;
    political_system?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const capitalGroup: Array<readonly [string, string]> = [
    ["capital", "fields.capital"],
  ];
  const bottomReferenceGroups: Array<readonly [string, string]> = [
    ["geography", "fields.geography"],
    ["beliefs", "fields.beliefs"],
    ["works", "fields.works"],
    ["knowledge", "fields.knowledge"],
    ["languages", "fields.languages"],
    ["characters", "fields.characters"],
    ["organizations", "fields.organizations"],
    ["events", "fields.events"],
  ];

  const politicalSystem =
    fields.political_system !== undefined
      ? t(`enums.political_system.${fields.political_system}`, {
          defaultValue: fields.political_system,
        })
      : undefined;

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (fields.population !== undefined && fields.population !== "") {
    chips.push({ label: t("fields.population"), value: fields.population });
  }
  if (politicalSystem !== undefined && politicalSystem !== "") {
    chips.push({ label: t("fields.political_system"), value: politicalSystem });
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
      {referenceList(capitalGroup, "mt-4")}
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

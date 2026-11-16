import { useTranslation } from "react-i18next";
import { StatisticsBlock } from "./character-sheet.js";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";
import type { Statistics } from "@dm/schemas";

/**
 * The bespoke sheet for "Monsters" (world → Bestiary), laid out like an
 * SRD stat block: the illustration as a banner, the statistics block,
 * the stat-adjacent references (languages, treasure types), then the
 * prose in SRD order — traits, actions, bonus actions, then the two
 * descriptions as headed frameless sections.
 */
export function MonsterSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    statistics?: Statistics;
    traits?: string;
    actions?: string;
    bonus_actions?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const referenceGroups: Array<readonly [string, string]> = [
    ["languages", "fields.languages"],
    ["treasure_types", "fields.treasure_types"],
  ];

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.traits", fields.traits ?? ""],
    ["fields.actions", fields.actions ?? ""],
    ["fields.bonus_actions", fields.bonus_actions ?? ""],
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

  return (
    <div>
      {fields.illustration !== undefined && fields.illustration !== "" && (
        <img
          src={fields.illustration}
          alt={props.record.title}
          className="mb-4 max-h-64 w-full rounded-md border border-border object-cover"
        />
      )}
      {fields.statistics !== undefined && (
        <StatisticsBlock statistics={fields.statistics} />
      )}
      {referenceGroups.some(([key]) => (references[key] ?? []).length > 0) && (
        <dl className="record-read-fields mt-4">
          {referenceGroups
            .filter(([key]) => (references[key] ?? []).length > 0)
            .map(([key, labelKey]) => (
              <div key={key} className="record-read-field">
                <dt>{t(labelKey)}</dt>
                <dd>
                  <TitleLinks targets={references[key] ?? []} />
                </dd>
              </div>
            ))}
        </dl>
      )}
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
    </div>
  );
}

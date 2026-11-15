import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Places" (world → Geography): the place type as a
 * chip, the population, the typed references as labeled link groups, and
 * the two descriptions as headed frameless prose sections.
 */
export function PlaceSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    place_type?: string;
    population?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const placeType =
    fields.place_type !== undefined
      ? t(`enums.place_type.${fields.place_type}`, {
          defaultValue: fields.place_type,
        })
      : undefined;

  const referenceGroups: Array<readonly [string, string]> = [
    ["leaders", "fields.leaders"],
    ["nations", "fields.nations"],
    ["characters", "fields.characters"],
    ["events", "fields.events"],
  ];

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {placeType !== undefined && (
          <span className="rounded-md border border-border bg-background px-2 py-1 text-sm">
            <span className="text-muted">{t("fields.place_type")} </span>
            <span className="text-ink">{placeType}</span>
          </span>
        )}
        {fields.population !== undefined && (
          <span className="rounded-md border border-border bg-background px-2 py-1 text-sm">
            <span className="text-muted">{t("fields.population")} </span>
            <span className="text-ink">{fields.population}</span>
          </span>
        )}
      </div>
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

import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Natural landmarks" (world → Geography): the
 * illustration as a banner, the associated nations as the structural
 * reference, and the two descriptions as headed frameless prose
 * sections.
 */
export function NaturalLandmarkSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const referenceGroups: Array<readonly [string, string]> = [
    ["nations", "fields.nations"],
  ];

  const proseBlocks: Array<readonly [string, string]> = [
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

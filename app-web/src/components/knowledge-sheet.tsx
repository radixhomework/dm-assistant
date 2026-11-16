import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Knowledge and technologies" (world → Culture):
 * the illustration as a banner, the place of origin as the structural
 * reference, the two descriptions as headed frameless prose sections,
 * then the associative references (events, places, characters,
 * self-referencing knowledge, nations, beliefs) just before the
 * scaffold's backlinks section.
 */
export function KnowledgeSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const originGroup: Array<readonly [string, string]> = [
    ["origin", "fields.origin"],
  ];
  const bottomReferenceGroups: Array<readonly [string, string]> = [
    ["events", "fields.events"],
    ["places", "fields.places"],
    ["characters", "fields.characters"],
    ["knowledge", "fields.knowledge"],
    ["nations", "fields.nations"],
    ["beliefs", "fields.beliefs"],
  ];

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

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
      {referenceList(originGroup, "mt-4")}
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

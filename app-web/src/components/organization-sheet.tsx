import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import { TitleLinks } from "./record-sheet.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Organizations" (world → Society): the
 * illustration as a banner, the member count as a chip, the structural
 * references (headquarters, leaders) as labeled link groups, the two
 * descriptions as headed frameless prose sections, then the associative
 * references (characters, organizations, events) just before the
 * scaffold's backlinks section.
 */
export function OrganizationSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    member_count?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const topReferenceGroups: Array<readonly [string, string]> = [
    ["headquarters", "fields.headquarters"],
    ["leaders", "fields.leaders"],
  ];
  const bottomReferenceGroups: Array<readonly [string, string]> = [
    ["characters", "fields.characters"],
    ["organizations", "fields.organizations"],
    ["events", "fields.events"],
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
      {fields.member_count !== undefined && fields.member_count !== "" && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-border bg-background px-2 py-1 text-sm">
            <span className="text-muted">{t("fields.member_count")} </span>
            <span className="text-ink">{fields.member_count}</span>
          </span>
        </div>
      )}
      {referenceList(topReferenceGroups, "mt-4")}
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

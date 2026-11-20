import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Chapter" (campaign): the illustration as a
 * banner, the DM summary as a headed frameless prose section, then the
 * parent campaign as the structural reference. The chapter's scenes are
 * rendered by the scaffold's children section at the end (play order,
 * links) — the sheet adds nothing for them.
 */
export function ChapterSheet(props: { readonly record: Entity }) {
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    dm_summary?: string;
    order?: number;
  };

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <ProseSections
        blocks={[["fields.dm_summary", fields.dm_summary ?? ""]]}
      />
      <ReferenceGroups
        groups={[["campaign", "fields.campaign"]]}
        references={props.record.references ?? {}}
        className="mt-8"
      />
    </div>
  );
}

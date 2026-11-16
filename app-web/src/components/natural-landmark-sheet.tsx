import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Natural landmarks" (world → Geography): the
 * illustration as a banner, the associated nations as the structural
 * reference, and the two descriptions as headed frameless prose
 * sections.
 */
export function NaturalLandmarkSheet(props: { readonly record: Entity }) {
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <ReferenceGroups
        groups={[["nations", "fields.nations"]]}
        references={references}
        className="mt-4"
      />
      <ProseSections
        blocks={[
          ["fields.public_description", fields.public_description ?? ""],
          ["fields.private_description", fields.private_description ?? ""],
        ]}
      />
    </div>
  );
}

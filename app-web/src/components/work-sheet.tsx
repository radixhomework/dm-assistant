import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Works" (world → Culture): the illustration as a
 * banner, the place of origin as the structural reference, the two
 * descriptions as headed frameless prose sections, then the associative
 * references (events, characters, organizations) just before the
 * scaffold backlinks section.
 */
export function WorkSheet(props: { readonly record: Entity }) {
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const bottomReferenceGroups: Array<readonly [string, string]> = [
    ["events", "fields.events"],
    ["characters", "fields.characters"],
    ["organizations", "fields.organizations"],
  ];

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <ReferenceGroups
        groups={[["origin", "fields.origin"]]}
        references={references}
        className="mt-4"
      />
      <ProseSections
        blocks={[
          ["fields.public_description", fields.public_description ?? ""],
          ["fields.private_description", fields.private_description ?? ""],
        ]}
      />
      <ReferenceGroups groups={bottomReferenceGroups} references={references} className="mt-8" />
    </div>
  );
}

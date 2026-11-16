import { useTranslation } from "react-i18next";
import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
  SheetChips,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Beliefs, myths and customs" (world → Culture):
 * the illustration as a banner, the follower count as a chip, the place
 * of origin as the structural reference, the two descriptions as headed
 * frameless prose sections, then the associative references (events,
 * characters, organizations, self-referencing beliefs) just before the
 * scaffold backlinks section.
 */
export function BeliefSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    follower_count?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const bottomReferenceGroups: Array<readonly [string, string]> = [
    ["events", "fields.events"],
    ["characters", "fields.characters"],
    ["organizations", "fields.organizations"],
    ["beliefs", "fields.beliefs"],
  ];

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (fields.follower_count !== undefined && fields.follower_count !== "") {
    chips.push({ label: t("fields.follower_count"), value: fields.follower_count });
  }

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <SheetChips chips={chips} />
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

import { useTranslation } from "react-i18next";
import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
  SheetChips,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Organizations" (world → Society): the
 * illustration as a banner, the member count as a chip, the structural
 * references (headquarters, leaders) as labeled link groups, the two
 * descriptions as headed frameless prose sections, then the associative
 * references (characters, organizations, events) just before the
 * scaffold backlinks section.
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

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (fields.member_count !== undefined && fields.member_count !== "") {
    chips.push({ label: t("fields.member_count"), value: fields.member_count });
  }

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <SheetChips chips={chips} />
      <ReferenceGroups groups={topReferenceGroups} references={references} className="mt-4" />
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

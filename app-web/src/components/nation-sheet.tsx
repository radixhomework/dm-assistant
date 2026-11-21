import { useTranslation } from "react-i18next";
import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
  SheetChips,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Nations" (world → Society): the illustration as
 * a banner, the population and political system as chips, the capital as
 * the structural reference, the two descriptions as headed frameless
 * prose sections, then the associative references just before the
 * scaffold backlinks section.
 */
export function NationSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    population?: string;
    political_system?: string;
    public_description?: string;
    private_description?: string;
  };
  const references = props.record.references ?? {};

  const bottomReferenceGroups: Array<readonly [string, string]> = [
    ["geography", "fields.geography"],
    ["beliefs", "fields.beliefs"],
    ["works", "fields.works"],
    ["knowledge", "fields.knowledge"],
    ["languages", "fields.languages"],
    ["characters", "fields.characters"],
    ["organizations", "fields.organizations"],
    ["events", "fields.events"],
  ];

  const politicalSystem =
    fields.political_system !== undefined
      ? t(`enums.political_system.${fields.political_system}`, {
          defaultValue: fields.political_system,
        })
      : undefined;

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (fields.population !== undefined && fields.population !== "") {
    chips.push({ label: t("fields.population"), value: fields.population });
  }
  if (politicalSystem !== undefined && politicalSystem !== "") {
    chips.push({ label: t("fields.political_system"), value: politicalSystem });
  }

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <SheetChips chips={chips} />
      <ReferenceGroups
        groups={[["capital", "fields.capital"]]}
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

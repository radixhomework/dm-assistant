import { useTranslation } from "react-i18next";
import { ProseSections, ReferenceGroups, SheetChips } from "./sheet-parts.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Places" (world → Geography): the place type and
 * population as chips, the typed references as labeled link groups, and
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

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (placeType !== undefined) chips.push({ label: t("fields.place_type"), value: placeType });
  if (fields.population !== undefined && fields.population !== "") {
    chips.push({ label: t("fields.population"), value: fields.population });
  }

  const referenceGroups: Array<readonly [string, string]> = [
    ["leaders", "fields.leaders"],
    ["nations", "fields.nations"],
    ["characters", "fields.characters"],
    ["events", "fields.events"],
  ];

  return (
    <div>
      <SheetChips chips={chips} />
      <ReferenceGroups groups={referenceGroups} references={references} className="mt-4" />
      <ProseSections
        blocks={[
          ["fields.public_description", fields.public_description ?? ""],
          ["fields.private_description", fields.private_description ?? ""],
        ]}
      />
    </div>
  );
}

import { StatisticsBlock } from "./character-sheet.js";
import { ProseSections } from "./sheet-parts.js";
import type { Entity } from "../types.js";
import type { Statistics } from "@dm/schemas";

/**
 * The shared sheet for the eight catalogs (records-editor 9.3): pitch,
 * public description, private description as headed frameless prose
 * sections; fauna and flora additionally embed the Statistics block
 * below the pitch. SRD-imported catalogs keep the same reading shape —
 * the edit-mode lock is a data concern, not a presentation one.
 */
export function CatalogSheet(props: {
  readonly record: Entity;
  readonly withStatistics?: boolean;
}) {
  const fields = (props.record.fields ?? {}) as {
    pitch?: string;
    statistics?: Statistics;
    public_description?: string;
    private_description?: string;
  };

  return (
    <div>
      <ProseSections blocks={[["fields.pitch", fields.pitch ?? ""]]} />
      {props.withStatistics && fields.statistics !== undefined && (
        <section className="mt-8">
          <StatisticsBlock statistics={fields.statistics} />
        </section>
      )}
      <ProseSections
        blocks={[
          ["fields.public_description", fields.public_description ?? ""],
          ["fields.private_description", fields.private_description ?? ""],
        ]}
      />
    </div>
  );
}

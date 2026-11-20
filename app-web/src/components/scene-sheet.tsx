import { useTranslation } from "react-i18next";
import {
  IllustrationBanner,
  ProseSections,
  ReferenceGroups,
  SheetChips,
} from "./sheet-parts.js";
import type { Entity } from "../types.js";

/** The translated play-status labels, per status. */
const statusLabelKeys: Record<string, string> = {
  not_played: "campaigns.status.not_played",
  in_progress: "campaigns.status.in_progress",
  played: "campaigns.status.played",
};

/**
 * The bespoke sheet for "Scene" (campaign): the illustration as a
 * banner, the play status and play order as chips, the DM summary and
 * the running notes (the multi-block prose the DM plays from) as headed
 * frameless prose sections, then the parent chapter as the structural
 * reference. The scaffold's backlinks section closes the sheet.
 */
export function SceneSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    dm_summary?: string;
    running_notes?: string;
    play_status?: string;
    order?: number;
  };
  const references = props.record.references ?? {};

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (fields.play_status !== undefined) {
    chips.push({
      label: t("fields.play_status"),
      value: t(statusLabelKeys[fields.play_status] ?? "campaigns.status.not_played"),
    });
  }
  if (fields.order !== undefined) {
    chips.push({ label: t("fields.order"), value: String(fields.order) });
  }

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <SheetChips chips={chips} />
      <ProseSections
        blocks={[
          ["fields.dm_summary", fields.dm_summary ?? ""],
          ["fields.running_notes", fields.running_notes ?? ""],
        ]}
      />
      <ReferenceGroups
        groups={[["chapter", "fields.chapter"]]}
        references={references}
        className="mt-8"
      />
    </div>
  );
}

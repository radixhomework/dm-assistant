import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";

/**
 * The framed "Actions" block (records-editor rework): traits, actions,
 * bonus actions, reactions and legendary actions — five rich-text prose
 * sections in one container, placed under the statistics block on the
 * character and monster sheets. Empty sections stay hidden.
 */
export function ActionsBlock(props: {
  readonly fields: {
    traits?: string;
    actions?: string;
    bonus_actions?: string;
    reactions?: string;
    legendary_actions?: string;
  };
}) {
  const { t } = useTranslation();
  const sections: Array<readonly [string, string]> = [
    ["fields.traits", props.fields.traits ?? ""],
    ["fields.actions", props.fields.actions ?? ""],
    ["fields.bonus_actions", props.fields.bonus_actions ?? ""],
    ["fields.reactions", props.fields.reactions ?? ""],
    ["fields.legendary_actions", props.fields.legendary_actions ?? ""],
  ];
  const filled = sections.filter(([, markdown]) => markdown !== "");
  if (filled.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
        {filled.map(([labelKey, markdown], index) => (
          <Fragment key={labelKey}>
            {index > 0 && <hr className="border-border" />}
            <div>
              <h2 className="font-display text-2xl text-ink">{t(labelKey)}</h2>
              <div className="mt-2">
                <ProseEditor markdown={markdown} readonly frame={false} />
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Game rules" (world → Game system): a rule is
 * never secret — the template carries only the public description,
 * rendered as a headed frameless prose section. No illustration, no
 * references, no chips.
 */
export function GameRuleSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    public_description: string | undefined;
  };
  return (
    <div>
      <section className="mt-8 first:mt-0">
        <h2 className="font-display text-2xl text-ink">
          {t("fields.public_description")}
        </h2>
        <div className="mt-2">
          <ProseEditor markdown={fields.public_description ?? ""} readonly frame={false} />
        </div>
      </section>
    </div>
  );
}

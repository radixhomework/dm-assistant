import { useTranslation } from "react-i18next";
import { ProseEditor } from "../editor/prose-editor.js";
import type { Entity } from "../types.js";

/**
 * The bespoke sheet for "Equipment and items" (world → Game system): the
 * illustration as a banner, the mechanical traits as chips (value with
 * its currency, weight, size, rarity, level — every chip optional), and
 * the prose sections in template order (public description,
 * characteristics, commerce, private description). The template declares
 * no references.
 */
export function EquipmentSheet(props: { readonly record: Entity }) {
  const { t } = useTranslation();
  const fields = (props.record.fields ?? {}) as {
    illustration?: string;
    value?: { amount?: number; currency?: string };
    weight?: string;
    size?: string;
    rarity?: string;
    level?: string;
    public_description?: string;
    characteristics?: string;
    commerce?: string;
    private_description?: string;
  };

  const value =
    fields.value?.amount !== undefined
      ? `${fields.value.amount} ${t(
          `money.${fields.value.currency ?? "gp"}`,
          { defaultValue: (fields.value.currency ?? "gp").toUpperCase() },
        )}`
      : undefined;

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (value !== undefined) {
    chips.push({ label: t("fields.value"), value });
  }
  if (fields.weight !== undefined && fields.weight !== "") {
    chips.push({ label: t("fields.weight"), value: fields.weight });
  }
  if (fields.size !== undefined) {
    chips.push({
      label: t("fields.size"),
      value: t(`enums.size.${fields.size}`, { defaultValue: fields.size }),
    });
  }
  if (fields.rarity !== undefined) {
    chips.push({
      label: t("fields.rarity"),
      value: t(`enums.rarity.${fields.rarity}`, { defaultValue: fields.rarity }),
    });
  }
  if (fields.level !== undefined && fields.level !== "") {
    chips.push({ label: t("fields.level"), value: fields.level });
  }

  const proseBlocks: Array<readonly [string, string]> = [
    ["fields.public_description", fields.public_description ?? ""],
    ["fields.characteristics", fields.characteristics ?? ""],
    ["fields.commerce", fields.commerce ?? ""],
    ["fields.private_description", fields.private_description ?? ""],
  ];

  return (
    <div>
      {fields.illustration !== undefined && fields.illustration !== "" && (
        <img
          src={fields.illustration}
          alt={props.record.title}
          className="mb-4 max-h-64 w-full rounded-md border border-border object-cover"
        />
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <span className="text-muted">{chip.label} </span>
              <span className="text-ink">{chip.value}</span>
            </span>
          ))}
        </div>
      )}
      {proseBlocks
        .filter(([, markdown]) => markdown !== "")
        .map(([labelKey, markdown]) => (
          <section key={labelKey} className="mt-8">
            <h2 className="font-display text-2xl text-ink">{t(labelKey)}</h2>
            <div className="mt-2">
              <ProseEditor markdown={markdown} readonly frame={false} />
            </div>
          </section>
        ))}
    </div>
  );
}

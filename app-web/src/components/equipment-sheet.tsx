import { useTranslation } from "react-i18next";
import { IllustrationBanner, ProseSections, SheetChips } from "./sheet-parts.js";
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

  const currency = fields.value?.currency ?? "gp";
  const currencyLabel = t(`money.${currency}`, { defaultValue: currency.toUpperCase() });
  const value =
    fields.value?.amount !== undefined ? `${fields.value.amount} ${currencyLabel}` : undefined;

  const chips: Array<{ readonly label: string; readonly value: string }> = [];
  if (value !== undefined) chips.push({ label: t("fields.value"), value });
  if (fields.weight !== undefined && fields.weight !== "") {
    chips.push({ label: t("fields.weight"), value: fields.weight });
  }
  if (fields.size !== undefined) {
    chips.push({ label: t("fields.size"), value: t(`enums.size.${fields.size}`, { defaultValue: fields.size }) });
  }
  if (fields.rarity !== undefined) {
    chips.push({ label: t("fields.rarity"), value: t(`enums.rarity.${fields.rarity}`, { defaultValue: fields.rarity }) });
  }
  if (fields.level !== undefined && fields.level !== "") {
    chips.push({ label: t("fields.level"), value: fields.level });
  }

  return (
    <div>
      <IllustrationBanner record={props.record} src={fields.illustration} />
      <SheetChips chips={chips} />
      <ProseSections
        blocks={[
          ["fields.public_description", fields.public_description ?? ""],
          ["fields.characteristics", fields.characteristics ?? ""],
          ["fields.commerce", fields.commerce ?? ""],
          ["fields.private_description", fields.private_description ?? ""],
        ]}
      />
    </div>
  );
}

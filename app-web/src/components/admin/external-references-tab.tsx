import { useTranslation } from "react-i18next";

/**
 * The External references tab lands with the round-4 change of the same
 * OpenSpec work (external-references capability): the tab exists from
 * the accounts-and-admin spec (six tabs) with an honest unavailable
 * state until then.
 */
export function ExternalReferencesTab() {
  const { t } = useTranslation();
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t("admin.externalRefs.title")}
      </h2>
      <p className="mt-2 text-muted">{t("admin.externalRefs.later")}</p>
      <p className="mt-1 text-sm text-muted">{t("admin.externalRefs.hint")}</p>
    </section>
  );
}

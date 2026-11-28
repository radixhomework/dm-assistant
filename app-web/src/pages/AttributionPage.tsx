import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchSources } from "../api/sources.js";
import { useRequireAuth } from "./useRequireAuth.js";

/**
 * The attribution credits page (srd-catalog-import spec): the fixed
 * Wizards of the Coast SRD 5.2 CC-BY-4.0 statement, then the instance's
 * external sources with their optional attribution note. Reachable from
 * the settings screen and from every external-source badge.
 */
export function AttributionPage() {
  const { t } = useTranslation();
  const { ready } = useRequireAuth();
  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
    enabled: ready,
  });

  const external = (sources.data ?? []).filter(
    (source) => !source.internal,
  );

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">
        {t("attribution.title")}
      </h1>

      <section className="mt-6 max-w-2xl">
        <h2 className="font-display text-2xl text-ink">
          {t("attribution.wotcTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("attribution.statement")}</p>
      </section>

      {external.length > 0 && (
        <section className="mt-8 max-w-2xl">
          <h2 className="font-display text-2xl text-ink">
            {t("attribution.sourcesTitle")}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {external.map((source) => (
              <li
                key={source.id}
                className="rounded-md border border-border bg-surface px-4 py-2"
              >
                <span className="text-ink">{source.name}</span>
                {source.attribution && (
                  <p className="text-sm text-muted">{source.attribution}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, inputClass } from "../form.js";
import { formString } from "../../forms.js";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client.js";
import { fetchBootstrapState } from "../../api/auth.js";

/**
 * The Instance tab (accounts-and-admin capability): world name and the
 * three unit selectors with the conversion barème as help — a labeling
 * preference, never a conversion engine (PRE-SPEC §2).
 */
export function InstanceTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () =>
      api<{
        worldName: string | null;
        distanceUnit: string | null;
        weightUnit: string | null;
        volumeUnit: string | null;
      }>("/api/admin/settings"),
    retry: false,
  });

  async function onSaveSettings(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: {
          worldName: formString(form, "worldName"),
          distanceUnit: formString(form, "distanceUnit"),
          weightUnit: formString(form, "weightUnit"),
          volumeUnit: formString(form, "volumeUnit"),
        },
      });
      setSaved(true);
      await settings.refetch();
      // Discard any pre-rename fetch and refresh even if the router only
      // seeded the bootstrap cache and no observer supplied a query function.
      await queryClient.cancelQueries({ queryKey: ["bootstrap"], exact: true });
      await queryClient
        .query({ queryKey: ["bootstrap"], queryFn: fetchBootstrapState, staleTime: 0 })
        .catch(() => undefined); // The settings save already succeeded.
    } catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t("admin.settings")}
      </h2>
      {error && <p className="mt-3 text-sm text-radish">{error}</p>}
      {settings.data === undefined ? (
        <p className="mt-4 text-sm text-muted">{t("common.loading")}</p>
      ) : (
        <form onSubmit={onSaveSettings} className="mt-4 flex max-w-md flex-col gap-3">
          <Field label={t("admin.worldName")}>
            <input
              name="worldName"
              required
              minLength={1}
              maxLength={80}
              defaultValue={settings.data?.worldName ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label={t("admin.distanceUnit")}>
            <select name="distanceUnit" defaultValue={settings.data?.distanceUnit ?? "m"} className={inputClass}>
              <option value="m">m</option>
              <option value="ft">ft</option>
            </select>
          </Field>
          <Field label={t("admin.weightUnit")}>
            <select name="weightUnit" defaultValue={settings.data?.weightUnit ?? "kg"} className={inputClass}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </Field>
          <Field label={t("admin.volumeUnit")}>
            <select name="volumeUnit" defaultValue={settings.data?.volumeUnit ?? "L"} className={inputClass}>
              <option value="L">L</option>
              <option value="gal">gal</option>
            </select>
          </Field>
          <p className="text-xs text-muted">{t("admin.unitBareme")}</p>
          <button type="submit" className="self-start rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
            {t("admin.save")}
          </button>
          {saved && <p className="text-sm text-primary">{t("admin.saved")}</p>}
        </form>
      )}
    </section>
  );
}

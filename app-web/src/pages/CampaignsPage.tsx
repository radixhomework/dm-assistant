import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { Entity } from "../types.js";

type CampaignWithTracking = Omit<Entity, "tracking"> & {
  tracking: { slug: string; status: string };
};

export function CampaignsPage() {
  const { t } = useTranslation();
  const { ready } = useRequireAuth();
  const [error, setError] = useState<string | null>(null);
  const campaigns = useQuery({
    queryKey: ["campaigns"],
    queryFn: async (): Promise<CampaignWithTracking[]> => {
      const list = await api<Entity[]>(
        "/api/records?perimeter=campaign&type=campaign",
      );
      return Promise.all(
        list.map(async (campaign) => ({
          ...campaign,
          tracking: await api<{
            slug: string;
            status: string;
          }>(`/api/records/${campaign.slug}/tracking`),
        })),
      );
    },
    enabled: ready,
    retry: false,
  });

  if (!ready) return null;
  if (campaigns.isPending)
    return <p className="text-muted">{t("common.loading")}</p>;

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/records", {
        method: "POST",
        body: {
          slug: String(form.get("slug")),
          type: "campaign",
          perimeter: "campaign",
          title: String(form.get("title")),
        },
      });
      await campaigns.refetch();
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-4xl font-semibold text-ink">
          {t("campaigns.title")}
        </h1>
        <button
          type="button"
          onClick={() => setError((value) => (value === "form" ? null : "form"))}
          className="rounded-md bg-primary px-4 py-2 text-sm text-background transition-colors duration-200 hover:bg-accent"
        >
          {t("campaigns.newCampaign")}
        </button>
      </div>

      {error === "form" && (
        <form
          onSubmit={onCreate}
          className="mt-6 flex max-w-md flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            {t("campaigns.title")}
            <input name="title" required className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("campaigns.slug")}
            <input name="slug" required pattern="[a-z0-9-]+" className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          {error !== null && error !== "form" && (
            <p className="text-sm text-radish">{error}</p>
          )}
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
            {t("campaigns.create")}
          </button>
        </form>
      )}

      {(campaigns.data ?? []).length === 0 && (
        <p className="mt-8 text-muted">{t("campaigns.empty")}</p>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {(campaigns.data ?? []).map((campaign) => (
          <li
            key={campaign.slug}
            className="flex items-baseline justify-between rounded-md border border-border bg-surface px-4 py-2"
          >
            <span className="text-ink">{campaign.title}</span>
            <span className="flex items-baseline gap-3">
              <span className="text-sm text-muted">
                {t(`campaigns.status.${campaign.tracking.status}`)}
              </span>
              <Link
                to="/campaigns/$slug"
                params={{ slug: campaign.slug }}
                className="text-sm text-accent hover:underline"
              >
                {t("campaigns.open")}
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

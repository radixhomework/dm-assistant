import { useQuery } from "@tanstack/react-query";
import { SlugTitleFields } from "../components/slug-fields.js";
import { formString } from "../forms.js";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useSlugAutoFill } from "../slug.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { Entity } from "../types.js";

type CampaignWithTracking = Omit<Entity, "tracking"> & {
  tracking: { slug: string; status: string };
};

export function CampaignsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const slugFields = useSlugAutoFill();
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

  async function onCreate(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/records", {
        method: "POST",
        body: {
          slug: formString(form, "slug"),
          type: "campaign",
          perimeter: "campaign",
          title: formString(form, "title"),
        },
      });
      void navigate({
        to: "/records/$slug",
        params: { slug: formString(form, "slug") },
        search: { edit: "1" },
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
          onClick={() => { setError((value) => (value === "form" ? null : "form")); if (error !== "form") slugFields.reset(); }}
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
          <SlugTitleFields fields={slugFields} />
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

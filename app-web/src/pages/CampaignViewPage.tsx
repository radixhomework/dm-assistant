import { useQuery } from "@tanstack/react-query";
import { formString } from "../forms.js";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useSlugAutoFill } from "../slug.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { Entity } from "../types.js";

type Tracking = {
  slug: string;
  status: string;
  children: Array<{ slug: string; title: string; status: string }>;
};

const statusBadgeClass = (status: string) => {
  if (status === "played") return "bg-primary text-background";
  if (status === "in_progress") return "bg-accent text-background";
  return "border border-border text-muted";
};

export function CampaignViewPage() {
  const { t } = useTranslation();
  const { slug } = useParams({ from: "/campaigns/$slug" });
  const { ready } = useRequireAuth();
  const slugFields = useSlugAutoFill();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<"chapter" | "scene" | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);

  const campaign = useQuery({
    queryKey: ["campaign-view", slug],
    queryFn: () =>
      api<Entity & { tracking: Tracking }>(`/api/records/${slug}`),
    enabled: ready,
    retry: false,
  });

  const chapterTrackings = useQuery({
    queryKey: ["chapter-trackings", slug],
    queryFn: async (): Promise<Record<string, Tracking>> => {
      const chapters = campaign.data?.tracking.children ?? [];
      const entries = await Promise.all(
        chapters.map(async (chapter) => [
          chapter.slug,
          await api<Tracking>(`/api/records/${chapter.slug}/tracking`),
        ]),
      );
      return Object.fromEntries(entries);
    },
    enabled: ready && campaign.isSuccess,
    retry: false,
  });

  if (!ready) return null;
  if (campaign.isPending)
    return <p className="text-muted">{t("common.loading")}</p>;
  if (campaign.isError || !campaign.data)
    return <p className="text-radish">{t("common.error")}</p>;

  const data = campaign.data;

  async function createChild(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creating || !parentForNew) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    const childType = creating;
    try {
      await api("/api/records", {
        method: "POST",
        body: {
          slug: formString(form, "slug"),
          type: childType,
          perimeter: "campaign",
          title: formString(form, "title"),
        },
      });
      await api(`/api/records/${formString(form, "slug")}/parent`, {
        method: "POST",
        body: { parentSlug: parentForNew, kind: childType },
      });
      setCreating(null);
      setParentForNew(null);
      await campaign.refetch();
      await chapterTrackings.refetch();
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  async function setSceneStatus(sceneSlug: string, status: string) {
    setError(null);
    try {
      const scene = await api<Entity>(`/api/records/${sceneSlug}`);
      await api(`/api/records/${sceneSlug}`, {
        method: "PATCH",
        body: { fields: { ...scene.fields, status } },
      });
      await campaign.refetch();
      await chapterTrackings.refetch();
    } catch (statusError) {
      setError(String(statusError));
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">{data.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {t(`campaigns.status.${data.tracking.status}`)}
      </p>

      {error && error !== "form" && (
        <p className="mt-2 text-sm text-radish">{error}</p>
      )}

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {t("campaigns.chapters")}
          </h2>
          <button
            type="button"
            onClick={() => {
              setCreating("chapter");
              setParentForNew(slug);
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent"
          >
            {t("campaigns.newChapter")}
          </button>
        </div>

        {(campaign.data.tracking.children ?? []).length === 0 && (
          <p className="mt-2 text-muted">{t("campaigns.empty")}</p>
        )}

        <ul className="mt-2 flex flex-col gap-3">
          {(campaign.data.tracking.children ?? []).map((chapter) => {
            const chapterTracking = chapterTrackings.data?.[chapter.slug];
            return (
              <li key={chapter.slug} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-xl text-ink">{chapter.title}</span>
                  <span className={`rounded-md px-2 py-0.5 text-sm ${statusBadgeClass(chapter.status)}`}>
                    {t(`campaigns.status.${chapter.status}`)}
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {t("campaigns.scenes")}
                  </h3>
                  <ul className="mt-1 flex flex-col gap-1">
                    {(chapterTracking?.children ?? []).map((scene) => (
                      <li key={scene.slug} className="flex items-baseline justify-between rounded-md border border-border bg-background px-3 py-1">
                        <span className="text-sm text-ink">{scene.title}</span>
                        <span className="flex items-baseline gap-2">
                          {(["not_played", "in_progress", "played"] as const).map(
                            (status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => void setSceneStatus(scene.slug, status)}
                                className={`rounded px-2 py-0.5 text-xs transition-colors duration-200 ${
                                  scene.status === status
                                    ? "bg-primary text-background"
                                    : "text-muted hover:text-accent"
                                }`}
                              >
                                {t(`campaigns.status.${status}`)}
                              </button>
                            ),
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating("scene");
                      setParentForNew(chapter.slug);
                    }}
                    className="mt-2 text-sm text-accent hover:underline"
                  >
                    {t("campaigns.newScene")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {creating && parentForNew && (
        <form
          onSubmit={createChild}
          className="mt-6 flex max-w-md flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <p className="text-sm text-muted">
            {creating} → {parentForNew}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            {t("common.fields.title")}
            <input name="title" required value={slugFields.title}
              onChange={(event) => slugFields.onTitleChange(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("common.fields.slug")}
            <input name="slug" required pattern="[a-z0-9-]+" value={slugFields.slug}
              onChange={(event) => slugFields.onSlugChange(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
              {t("campaigns.create")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(null);
                setParentForNew(null);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

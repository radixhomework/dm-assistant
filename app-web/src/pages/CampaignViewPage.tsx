import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Save, Trash2 } from "lucide-react";
import { formString } from "../forms.js";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { Dialog } from "../components/dialog.js";
import { RecordFormFields } from "../components/record-form-fields.js";
import { IllustrationBanner, ProseSections } from "../components/sheet-parts.js";
import { useSlugAutoFill } from "../slug.js";
import { useRequireAuth } from "./useRequireAuth.js";
import { templateSchemaOf } from "@dm/schemas";
import type { Entity } from "../types.js";

type Tracking = {
  id?: string;
  slug: string;
  status: string;
  children: Array<{ id?: string; slug: string; title: string; status: string }>;
};

const statusBadgeClass = (status: string) => {
  if (status === "played") return "bg-primary text-background";
  if (status === "in_progress") return "bg-accent text-background";
  return "border border-border text-muted";
};

function MoveButtons(props: {
  readonly slug: string;
  readonly onMove: (slug: string, direction: "up" | "down") => void;
}) {
  const { t } = useTranslation();
  return (
    <span className="flex items-center">
      <button
        type="button"
        aria-label={t("campaigns.moveUp")}
        title={t("campaigns.moveUp")}
        onClick={() => props.onMove(props.slug, "up")}
        className="rounded p-0.5 text-muted transition-colors duration-200 hover:text-accent"
      >
        <ArrowUp className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={t("campaigns.moveDown")}
        title={t("campaigns.moveDown")}
        onClick={() => props.onMove(props.slug, "down")}
        className="rounded p-0.5 text-muted transition-colors duration-200 hover:text-accent"
      >
        <ArrowDown className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

/**
 * The campaign page — one URL for both facets of the campaign: the
 * record content (illustration, pitch, DM summary) and the chapter/scene
 * manager. Edit mode (?edit=1) swaps the manager for the campaign
 * record's template form.
 */
export function CampaignViewPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/campaigns/$id" });
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const search = useSearch({ from: "/campaigns/$id" }) as { edit?: boolean | string };
  const inEdit = search.edit === true;
  const slugFields = useSlugAutoFill();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState<"chapter" | "scene" | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, unknown> | null>(null);

  const campaign = useQuery({
    queryKey: ["campaign-view", id],
    queryFn: () => api<Entity & { tracking: Tracking }>(`/api/records/${id}`),
    enabled: ready,
    retry: false,
  });

  const chapterTrackings = useQuery({
    queryKey: ["chapter-trackings", id],
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

  // The record draft seeds once per loaded campaign and is re-seeded
  // when an edit session starts — the manager's refetches never
  // overwrite unsaved edits.
  useEffect(() => {
    if (campaign.data && fields === null) {
      setFields(campaign.data.fields);
    }
  }, [campaign.data, fields]);

  if (!ready) return null;
  if (campaign.isPending)
    return <p className="text-muted">{t("common.loading")}</p>;
  if (campaign.isError || !campaign.data)
    return <p className="text-radish">{t("common.error")}</p>;

  const data = campaign.data;

  function enterEdit() {
    setSaved(false);
    setError(null);
    if (campaign.data) setFields(campaign.data.fields);
  }

  function cancelEdit() {
    if (campaign.data) setFields(campaign.data.fields);
  }

  async function onSave(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/records/${id}`, {
        method: "PATCH",
        body: {
          title: formString(form, "title"),
          fields: fields ?? {},
        },
      });
      setSaved(true);
      await campaign.refetch();
    } catch (saveError) {
      setError(String(saveError));
    }
  }

  async function createChild(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creating || !parentForNew) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    const childType = creating;
    try {
      const created = await api<{ id: string }>("/api/records", {
        method: "POST",
        body: {
          slug: formString(form, "slug"),
          type: childType,
          perimeter: "campaign",
          title: formString(form, "title"),
        },
      });
      await api(`/api/records/${created.id}/parent`, {
        method: "POST",
        body: { parentSlug: parentForNew, kind: childType },
      });
      // Straight into editing the freshly created chapter/scene at its
      // hierarchy URL.
      if (childType === "chapter") {
        void navigate({
          to: "/campaigns/$id/$chapterId",
          params: { id: parentForNew, chapterId: created.id },
          search: { edit: true },
        });
      } else {
        void navigate({
          to: "/campaigns/$id/$chapterId/$sceneId",
          params: { id, chapterId: parentForNew, sceneId: created.id },
          search: { edit: true },
        });
      }
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
        body: { fields: { ...scene.fields, play_status: status } },
      });
      await campaign.refetch();
      await chapterTrackings.refetch();
    } catch (statusError) {
      setError(String(statusError));
    }
  }

  async function moveChild(slug: string, direction: "up" | "down") {
    setError(null);
    try {
      await api(`/api/records/${slug}/move`, { method: "POST", body: { direction } });
      await campaign.refetch();
      await chapterTrackings.refetch();
    } catch (moveError) {
      setError(String(moveError));
    }
  }

  async function onDeleteRecord(targetSlug: string) {
    setError(null);
    try {
      await api(`/api/records/${targetSlug}`, { method: "DELETE" });
      if (targetSlug === id) {
        void navigate({ to: "/campaigns" });
        return;
      }
      await campaign.refetch();
      await chapterTrackings.refetch();
    } catch (deleteError) {
      setError(String(deleteError));
    }
  }

  if (inEdit) {
    // Edit mode: the campaign record's template form (title,
    // illustration, pitch, DM summary). The chapters manager hides — the
    // hierarchy is managed from the reading view.
    const fieldsForForm = (fields ?? {}) as Record<string, unknown>;
    return (
      <div>
        <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-3 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-semibold text-ink">
                {data.title}
              </h1>
              <p className="mt-1 text-sm text-muted">{data.type}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1.5">
              <button
                type="submit"
                form="campaign-edit-form"
                className="rounded-md bg-primary p-2 text-background transition-colors duration-200 hover:bg-accent"
                title={t("lore.save")}
                aria-label={t("lore.save")}
              >
                <Save className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-surface"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
        <form
          id="campaign-edit-form"
          onSubmit={onSave}
          className="mt-6 flex max-w-md flex-col gap-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            {t("common.fields.title")}
            <input
              name="title"
              required
              defaultValue={data.title}
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          {templateSchemaOf("campaign") ? (
            <RecordFormFields
              schema={templateSchemaOf("campaign")!}
              fields={fieldsForForm}
              onChange={setFields}
            />
          ) : null}
          {error && <p className="text-sm text-radish">{error}</p>}
        </form>
      </div>
    );
  }

  const campaignFields = (data.fields ?? {}) as {
    illustration?: string;
    pitch?: string;
    dm_summary?: string;
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-semibold text-ink">{data.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {t(`campaigns.status.${data.tracking.status}`)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1.5">
            <button
              type="button"
              onClick={enterEdit}
              className="rounded-md border border-border p-2 text-ink transition-colors duration-200 hover:bg-surface"
              title={t("record.edit")}
              aria-label={t("record.edit")}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(t("campaigns.deleteCampaignConfirm"))) void onDeleteRecord(id);
              }}
              className="rounded-md border border-border p-2 text-radish transition-colors duration-200 hover:bg-surface"
              title={t("campaigns.deleteCampaign")}
              aria-label={t("campaigns.deleteCampaign")}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <IllustrationBanner record={data} src={campaignFields.illustration} />
      {saved && <p className="mt-3 text-sm text-primary">{t("lore.saved")}</p>}
      {error && error !== "form" && (
        <p className="mt-3 text-sm text-radish">{error}</p>
      )}
      <ProseSections
        blocks={[
          ["fields.pitch", campaignFields.pitch ?? ""],
          ["fields.dm_summary", campaignFields.dm_summary ?? ""],
        ]}
      />

      <section className="mt-8 border-t border-border pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {t("campaigns.chapters")}
          </h2>
          <button
            type="button"
            onClick={() => {
              slugFields.reset();
              setError(null);
              setCreating("chapter");
              setParentForNew(id);
              setParentTitle(data.title);
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
            const chapterRouteParams = {
              id,
              chapterId: chapter.id ?? chapter.slug,
            };
            return (
              <li key={chapter.slug} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <span className="flex items-center gap-1">
                    <Link
                      to="/campaigns/$id/$chapterId"
                      params={chapterRouteParams}
                      className="font-display text-xl text-ink hover:underline"
                    >
                      {chapter.title}
                    </Link>
                    <MoveButtons slug={chapter.slug} onMove={(slug, direction) => void moveChild(slug, direction)} />
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-sm ${statusBadgeClass(chapter.status)}`}>
                      {t(`campaigns.status.${chapter.status}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(t("campaigns.deleteConfirm"))) void onDeleteRecord(chapter.slug);
                      }}
                      className="text-sm text-radish hover:underline"
                    >
                      {t("campaigns.delete")}
                    </button>
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {t("campaigns.scenes")}
                  </h3>
                  <ul className="mt-1 flex flex-col gap-1">
                    {(chapterTracking?.children ?? []).map((scene) => (
                      <li key={scene.slug} className="flex items-baseline justify-between rounded-md border border-border bg-background px-3 py-1">
                        <span className="flex items-center gap-1">
                          <Link
                            to="/campaigns/$id/$chapterId/$sceneId"
                            params={{
                              id,
                              chapterId: chapter.id ?? chapter.slug,
                              sceneId: scene.id ?? scene.slug,
                            }}
                            className="text-sm text-ink hover:underline"
                          >
                            {scene.title}
                          </Link>
                          <MoveButtons slug={scene.slug} onMove={(slug, direction) => void moveChild(slug, direction)} />
                        </span>
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
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(t("campaigns.deleteConfirm"))) void onDeleteRecord(scene.slug);
                            }}
                            className="text-xs text-radish hover:underline"
                          >
                            {t("campaigns.delete")}
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      slugFields.reset();
                      setError(null);
                      setCreating("scene");
                      setParentForNew(chapter.id ?? chapter.slug);
                      setParentTitle(chapter.title);
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
        <Dialog
          title={
            creating === "chapter"
              ? t("campaigns.newChapter")
              : t("campaigns.newScene")
          }
          onClose={() => {
            setCreating(null);
            setParentForNew(null);
            setError(null);
            slugFields.reset();
          }}
        >
          <form onSubmit={createChild} className="flex flex-col gap-3">
            {creating === "scene" && parentTitle && (
              <p className="text-sm text-muted">{t("campaigns.inParent", { title: parentTitle })}</p>
            )}
            <label className="flex flex-col gap-1 text-sm">
              {t("common.fields.title")}
              <input name="title" required value={slugFields.title}
                onChange={(event) => slugFields.onTitleChange(event.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <input type="hidden" name="slug" value={slugFields.slug} />
            {error && <p className="text-sm text-radish">{error}</p>}
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
                className="rounded-md border border-border px-4 py-2 text-sm text-muted transition-colors duration-200 hover:bg-background"
              >
                {t("common.cancel")}
                </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

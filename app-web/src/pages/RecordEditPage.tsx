import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formString } from "../forms.js";
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { FilePlus, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { RecordFormFields } from "../components/record-form-fields.js";
import { RecordSheet } from "../components/record-sheet.js";
import { CharacterSheet } from "../components/character-sheet.js";
import { PlaceSheet } from "../components/place-sheet.js";
import { OrganizationSheet } from "../components/organization-sheet.js";
import { MonsterSheet } from "../components/monster-sheet.js";
import { NationSheet } from "../components/nation-sheet.js";
import { NaturalLandmarkSheet } from "../components/natural-landmark-sheet.js";
import { WorkSheet } from "../components/work-sheet.js";
import { EventSheet } from "../components/event-sheet.js";
import { EquipmentSheet } from "../components/equipment-sheet.js";
import { BeliefSheet } from "../components/belief-sheet.js";
import { KnowledgeSheet } from "../components/knowledge-sheet.js";
import { GameRuleSheet } from "../components/game-rule-sheet.js";
import { templateSchemaOf } from "@dm/schemas";
import { getWorldName } from "../api/auth.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { Entity } from "../types.js";

/**
 * Record page: opens in reading mode (PRE-SPEC.md §5 rule 10 flow) and an
 * explicit Edit action leads to the edit form; saving or cancelling
 * returns to the reading view. The bespoke per-template sheet replaces
 * the interim field rows at phase 9.
 */
export function RecordEditPage() {
  const { slug } = useParams({ from: "/records/$slug" });
  // validateSearch normalizes the edit=1 query flag to the boolean true;
  // accept both spellings so the creation forms' edit intent survives.
  const initialEdit = useRouterState({
    select: (s) => s.location.search?.edit === "1" || s.location.search?.edit === true,
  });
  // Remount per record: navigating slug → slug resets mode and flags
  // through the component lifecycle instead of competing effects.
  // state.edit = true when navigating straight from a creation form.
  return <RecordPage key={slug} slug={slug} initialEdit={initialEdit} />;
}

function RecordPage({
  slug,
  initialEdit,
}: {
  readonly slug: string;
  readonly initialEdit: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const [mode, setMode] = useState<"read" | "edit">(initialEdit ? "edit" : "read");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();
  const record = useQuery({
    queryKey: ["record", slug],
    queryFn: () => api<Entity>(`/api/records/${slug}`),
    enabled: ready,
    retry: false,
  });
  async function onSaveRecord(): Promise<void> {
    // The sidebar campaign tree and campaign view share this cache.
    await queryClient.invalidateQueries({ queryKey: ["campaign-view"] });
  }

  async function attachReference(field: string, targetSlug: string): Promise<void> {
    setError(null);
    try {
      await api(`/api/records/${slug}/refs/${field}`, {
        method: "POST",
        body: { targetSlug },
      });
      await record.refetch();
    } catch (attachError) {
      setError(String(attachError));
    }
  }

  async function detachReference(field: string, targetSlug: string): Promise<void> {
    setError(null);
    try {
      await api(`/api/records/${slug}/refs/${field}/${targetSlug}`, {
        method: "DELETE",
      });
      await record.refetch();
    } catch (detachError) {
      setError(String(detachError));
    }
  }

  // Field values flow through onChange instead of FormData once the
  // record is loaded (one state source of truth per control). Hooks stay
  // above the early returns.
  useEffect(() => {
    if (record.data) {
      setFields(record.data.fields);
    }
  }, [record.data]);

  // Tab title: DMA - <record title> on a record page, DM Assistant elsewhere.
  useEffect(() => {
    const world = getWorldName();
    document.title = record.data
      ? `${world ?? "DM Assistant"} - ${record.data.title}`
      : (world ?? "DM Assistant");
    return () => {
      document.title = world ?? "DM Assistant";
    };
  }, [record.data]);

  if (!ready) return null;
  if (record.isPending)
    return <p className="text-muted">{t("common.loading")}</p>;
  if (record.isError || !record.data)
    return <p className="text-radish">{t("common.error")}</p>;
  // The reading view mounts its editors only once the field values are
  // known: TipTap ignores content prop changes after mount, so mounting
  // with "" would show empty prose fields.
  if (fields === null) return <p className="text-muted">{t("common.loading")}</p>;

  const data = record.data;
  const fieldsJson = JSON.stringify(data.fields, null, 2);

  function enterEdit() {
    setSaved(false);
    setError(null);
    setMode("edit");
  }

  async function onSave(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    let payloadFields: unknown;
    if (templateSchemaOf(data.type)) {
      payloadFields = fields ?? {};
    } else {
      try {
        payloadFields = JSON.parse(formString(form, "fields") || "{}");
      } catch {
        setError("Invalid JSON");
        return;
      }
    }
    try {
      await api(`/api/records/${slug}`, {
        method: "PATCH",
        body: {
          title: formString(form, "title"),
          tags: data.tags,
          fields: payloadFields,
        },
      });
      setSaved(true);
      await record.refetch();
      await onSaveRecord();
      setMode("read");
    } catch (saveError) {
      setError(String(saveError));
    }
  }

  async function onDelete() {
    // Guard against misclicks: the DM confirms before the record goes.
    if (!confirm(t("record.deleteConfirm"))) return;
    setError(null);
    try {
      await api(`/api/records/${slug}`, { method: "DELETE" });
      void navigate({ to: "/" });
    } catch (deleteError) {
      setError(String(deleteError));
    }
  }

  if (mode === "edit") {
    return (
      <div>
        {/* The header carries the form actions: Save submits the form
         * through its id (the button lives outside the form element),
         * Cancel returns to the reading view. */}
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
                form="record-edit-form"
                className="rounded-md bg-primary p-2 text-background transition-colors duration-200 hover:bg-accent"
                title={t("lore.save")}
                aria-label={t("lore.save")}
              >
                <Save className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setMode("read")}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-surface"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
        <form id="record-edit-form" onSubmit={onSave} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            {t("common.fields.title")}
            <input name="title" defaultValue={data.title} className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          {templateSchemaOf(data.type) ? (
            <RecordFormFields
              schema={templateSchemaOf(data.type)!}
              fields={fields ?? {}}
              onChange={setFields}
              references={(data.references ?? {}) as Record<string, Array<{ slug: string; title: string }>>}
              onAttachReference={(field, targetSlug) => void attachReference(field, targetSlug)}
              onDetachReference={(field, targetSlug) => void detachReference(field, targetSlug)}
            />
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              {t("lore.fields")}
              <textarea name="fields" rows={8} defaultValue={fieldsJson} className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" />
            </label>
          )}
          {error && <p className="text-sm text-radish">{error}</p>}
        </form>
      </div>
    );
  }

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
              type="button"
              onClick={() => void navigate({ to: "/lore", search: { new: "1" } })}
              className="rounded-md bg-primary p-2 text-background transition-colors duration-200 hover:bg-accent"
              title={t("lore.newRecord")}
              aria-label={t("lore.newRecord")}
            >
              <FilePlus className="size-4" aria-hidden />
            </button>
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
              onClick={() => void onDelete()}
              className="rounded-md border border-border p-2 text-radish transition-colors duration-200 hover:bg-surface"
              title={t("lore.delete")}
              aria-label={t("lore.delete")}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      {saved && <p className="mt-3 text-sm text-primary">{t("lore.saved")}</p>}
      {error && <p className="mt-3 text-sm text-radish">{error}</p>}
      <RecordSheet
        record={data}
        slot={
          data.type === "characters-and-entities" ? (
            <CharacterSheet record={data} />
          ) : data.type === "places" ? (
            <PlaceSheet record={data} />
          ) : data.type === "organizations" ? (
            <OrganizationSheet record={data} />
          ) : data.type === "monsters" ? (
            <MonsterSheet record={data} />
          ) : data.type === "nations" ? (
            <NationSheet record={data} />
          ) : data.type === "natural-landmarks" ? (
            <NaturalLandmarkSheet record={data} />
          ) : data.type === "works" ? (
            <WorkSheet record={data} />
          ) : data.type === "events" ? (
            <EventSheet record={data} />
          ) : data.type === "equipment-and-items" ? (
            <EquipmentSheet record={data} />
          ) : data.type === "beliefs-myths-and-customs" ? (
            <BeliefSheet record={data} />
          ) : data.type === "knowledge-and-technologies" ? (
            <KnowledgeSheet record={data} />
          ) : data.type === "game-rules" ? (
            <GameRuleSheet record={data} />
          ) : undefined
        }
      />
    </div>
  );
}

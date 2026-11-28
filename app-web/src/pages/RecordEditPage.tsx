import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formString } from "../forms.js";
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { FilePlus, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { TagsEditor } from "../components/tags-editor.js";
import { RecordFormFields } from "../components/record-form-fields.js";
import { RecordSheet } from "../components/record-sheet.js";
import { bespokeSheetFor } from "../components/record-sheet-registry.js";
import { templateSchemaOf } from "@dm/schemas";
import { getWorldName } from "../api/auth.js";
import { useRequireAuth } from "./useRequireAuth.js";
import { recordRoute } from "../urls.js";
import type { Entity } from "../types.js";

/**
 * Record pages: uuid-addressed, opening in reading mode (PRE-SPEC.md §5
 * rule 10 flow) with an explicit Edit action leading to the edit form;
 * saving or cancelling returns to the reading view. The bespoke
 * per-template sheet replaces the generic field rows. The page splits
 * into a state-owning RecordPage and the two view components — each
 * stays under the cognitive-complexity gate.
 */

export type RecordPageKind = "lore" | "chapter" | "scene";

/** The sticky page header shared by both modes, with mode-specific
 * actions on the right. */
function SheetHeader(props: {
  readonly title: string;
  readonly subtitle: string;
  readonly actions: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-3 pt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold text-ink">
            {props.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{props.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1.5">{props.actions}</div>
      </div>
    </div>
  );
}

/** Reading view: the saved record through its bespoke sheet (or the
 * generic scaffold) with the shared header actions. The creation
 * shortcut is a Lore affordance — campaign records (chapters, scenes)
 * create from their campaign page. */
function RecordReadView(props: {
  readonly data: Entity;
  readonly saved: boolean;
  readonly error: string | null;
  readonly onEnterEdit: () => void;
  readonly onDelete: () => void;
  readonly showCreate?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Sheet = bespokeSheetFor(props.data.type);
  return (
    <div>
      <SheetHeader
        title={props.data.title}
        subtitle={props.data.type}
        actions={
          <>
            {props.showCreate && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/lore", search: { new: true } })}
                className="rounded-md bg-primary p-2 text-background transition-colors duration-200 hover:bg-accent"
                title={t("lore.newRecord")}
                aria-label={t("lore.newRecord")}
              >
                <FilePlus className="size-4" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={props.onEnterEdit}
              className="rounded-md border border-border p-2 text-ink transition-colors duration-200 hover:bg-surface"
              title={t("record.edit")}
              aria-label={t("record.edit")}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={props.onDelete}
              className="rounded-md border border-border p-2 text-radish transition-colors duration-200 hover:bg-surface"
              title={t("lore.delete")}
              aria-label={t("lore.delete")}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </>
        }
      />
      {props.saved && <p className="mt-3 text-sm text-primary">{t("lore.saved")}</p>}
      {props.error && <p className="mt-3 text-sm text-radish">{props.error}</p>}
      <RecordSheet
        record={props.data}
        slot={Sheet ? <Sheet record={props.data} /> : undefined}
      />
    </div>
  );
}

/** Edit view: the sticky header carries the form actions (Save submits
 * through the form id; Cancel returns to reading), the form follows. */
function RecordEditView(props: {
  readonly data: Entity;
  readonly fields: Record<string, unknown>;
  readonly setFields: (fields: Record<string, unknown>) => void;
  readonly tags: readonly string[];
  readonly setTags: (tags: string[]) => void;
  readonly error: string | null;
  readonly onSave: (event: React.SubmitEvent<HTMLFormElement>) => void;
  readonly onCancel: () => void;
  readonly onAttachReference: (field: string, targetSlug: string) => Promise<void>;
  readonly onDetachReference: (field: string, targetSlug: string) => Promise<void>;
  readonly hideReferenceFields?: readonly string[];
  readonly saving: boolean;
}) {
  const { t } = useTranslation();
  const schema = templateSchemaOf(props.data.type);
  const fieldsJson = JSON.stringify(props.data.fields, null, 2);
  return (
    <div>
      <SheetHeader
        title={props.data.title}
        subtitle={props.data.type}
        actions={
          <>
            <button
              type="submit"
              form="record-edit-form"
              disabled={props.saving}
              className="rounded-md bg-primary p-2 text-background transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              title={t("lore.save")}
              aria-label={t("lore.save")}
            >
              <Save className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={props.onCancel}
              disabled={props.saving}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors duration-200 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
          </>
        }
      />
      {/* inert pins the draft while the save is in flight: a late edit
       * could never reach the PATCH already carrying the earlier value. */}
      <form
        id="record-edit-form"
        onSubmit={props.onSave}
        inert={props.saving}
        className="mt-6 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          {t("common.fields.title")}
          <input name="title" defaultValue={props.data.title} className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        {/* The tags section: instance-level metadata outside the
         * template fields (record-tags capability). */}
        <TagsEditor tags={props.tags} onChange={props.setTags} disabled={props.saving} />
        {schema ? (
          <RecordFormFields
            schema={schema}
            fields={props.fields}
            onChange={props.setFields}
            references={(props.data.references ?? {}) as Record<string, Array<{ slug: string; title: string }>>}
            onAttachReference={(field, targetSlug) => void props.onAttachReference?.(field, targetSlug)}
            onDetachReference={(field, targetSlug) => void props.onDetachReference?.(field, targetSlug)}
            hideReferenceFields={props.hideReferenceFields}
          />
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            {t("lore.fields")}
            <textarea name="fields" rows={8} defaultValue={fieldsJson} className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" />
          </label>
        )}
        {props.error && <p className="text-sm text-radish">{props.error}</p>}
      </form>
    </div>
  );
}

/** The state-owning record page: query, draft lifecycle and the record
 * mutations; the views receive callbacks. Every API call carries the
 * uuid — the backend resolves it like the slug. */
function RecordPage(props: {
  readonly id: string;
  readonly initialEdit: boolean;
  readonly kind: RecordPageKind;
  /** Where a successful delete navigates back to (the parent page for
   * hierarchy records, the Lore index for world records). */
  readonly afterDeleteTo: { to: string; params?: Record<string, string> };
  /** The hierarchy reference pickers hidden in edit mode (parents are
   * immutable). */
  readonly hideReferenceFields?: readonly string[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const [mode, setMode] = useState<"read" | "edit">(props.initialEdit ? "edit" : "read");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, unknown> | null>(null);
  // The tags draft follows the fields draft lifecycle: seeded once per
  // loaded record, re-seeded when an edit session starts or is
  // cancelled, never clobbered by a reference attach/detach refetch.
  const [tags, setTags] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  // While a save is pending the edit session is pinned: Save and Cancel
  // are disabled so a completing save can never close a *newer* edit
  // session and silently discard its draft.
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const record = useQuery({
    queryKey: ["record", props.id],
    queryFn: () => api<Entity>(`/api/records/${props.id}`),
    enabled: ready,
    retry: false,
  });

  // Field values flow through onChange instead of FormData once the
  // record is loaded (one state source of truth per control). Hooks stay
  // above the early returns. The draft initializes once per loaded
  // record and is then re-seeded only when an edit session starts or is
  // cancelled — a reference attach/detach refetch must never overwrite
  // unsaved field edits.
  useEffect(() => {
    if (record.data && fields === null) {
      setFields(record.data.fields);
    }
  }, [record.data, fields]);
  useEffect(() => {
    if (record.data && tags === null) {
      setTags(record.data.tags);
    }
  }, [record.data, tags]);

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
  if (record.isPending) return <p className="text-muted">{t("common.loading")}</p>;
  // The error state precedes the draft wait: a failed request never
  // initializes fields, and the page must show the failure instead of
  // the loading message.
  if (record.isError || !record.data)
    return <p className="text-radish">{t("common.error")}</p>;
  if (fields === null) return <p className="text-muted">{t("common.loading")}</p>;

  const data = record.data;

  function enterEdit() {
    setSaved(false);
    setError(null);
    // A fresh session seeds the draft from the saved record: a previous
    // cancelled draft never leaks into the next edit.
    setFields(data.fields);
    setTags(data.tags);
    setMode("edit");
  }

  function cancelEdit() {
    // Discard the draft: the next edit seeds again from the saved
    // record.
    setFields(data.fields);
    setTags(data.tags);
    setMode("read");
  }

  async function invalidateCampaignTree(): Promise<void> {
    // The sidebar campaign tree and campaign view share this cache.
    await queryClient.invalidateQueries({ queryKey: ["campaign-view"] });
    await queryClient.invalidateQueries({ queryKey: ["chapter-trackings"] });
  }

  async function attachReference(field: string, targetSlug: string): Promise<void> {
    setError(null);
    try {
      await api(`/api/records/${props.id}/refs/${field}`, {
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
      await api(`/api/records/${props.id}/refs/${field}/${targetSlug}`, {
        method: "DELETE",
      });
      await record.refetch();
    } catch (detachError) {
      setError(String(detachError));
    }
  }

  async function onSave(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const schema = templateSchemaOf(data.type);
    let payloadFields: unknown;
    if (schema) {
      payloadFields = fields ?? {};
    } else {
      try {
        payloadFields = JSON.parse(formString(form, "fields") || "{}");
      } catch {
        setError("Invalid JSON");
        return;
      }
    }
    setSaving(true);
    try {
      await api(`/api/records/${props.id}`, {
        method: "PATCH",
        body: {
          title: formString(form, "title"),
          tags: tags ?? data.tags,
          fields: payloadFields,
        },
      });
      setSaved(true);
      await record.refetch();
      // The save may have introduced new tags: the editor's completion
      // inventory must not show a stale list next session (staleTime
      // Infinity keeps it until invalidated).
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await invalidateCampaignTree();
      setMode("read");
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    // Guard against misclicks: the DM confirms before the record goes.
    if (!confirm(t("record.deleteConfirm"))) return;
    setError(null);
    try {
      await api(`/api/records/${props.id}`, { method: "DELETE" });
      await invalidateCampaignTree();
      void navigate({
        to: props.afterDeleteTo.to,
        params: props.afterDeleteTo.params ?? ({} as never),
      });
    } catch (deleteError) {
      setError(String(deleteError));
    }
  }

  if (mode === "edit") {
    return (
      <RecordEditView
        data={data}
        fields={fields}
        setFields={setFields}
        tags={tags ?? data.tags}
        setTags={setTags}
        error={error}
        onSave={onSave}
        onCancel={cancelEdit}
        onAttachReference={attachReference}
        onDetachReference={detachReference}
        hideReferenceFields={props.hideReferenceFields}
        saving={saving}
      />
    );
  }

  return (
    <RecordReadView
      data={data}
      saved={saved}
      error={error}
      onEnterEdit={enterEdit}
      onDelete={() => void onDelete()}
      showCreate={props.kind === "lore"}
    />
  );
}

/** Route entry — Lore records (world perimeter). */
export function LoreRecordPage() {
  const { id } = useParams({ from: "/lore/$id" });
  // validateSearch normalizes the edit flag to the boolean true; accept
  // both spellings so the creation forms' edit intent survives.
  const initialEdit = useRouterState({
    select: (s) => s.location.search?.edit === "1" || s.location.search?.edit === true,
  });
  // Remount per record: navigation resets the session state through the
  // component lifecycle instead of competing effects.
  return (
    <RecordPage
      key={id}
      id={id}
      initialEdit={initialEdit}
      kind="lore"
      afterDeleteTo={{ to: "/lore" }}
    />
  );
}

/** Route entry — a Chapter inside its campaign. */
export function ChapterRecordPage() {
  const { id, chapterId } = useParams({ from: "/campaigns/$id/$chapterId" });
  const navigate = useNavigate();
  const initialEdit = useRouterState({
    select: (s) => s.location.search?.edit === "1" || s.location.search?.edit === true,
  });
  const record = useQuery({
    queryKey: ["record", chapterId],
    queryFn: () => api<Entity>(`/api/records/${chapterId}`),
    retry: false,
  });
  // Chain validation: the chapter's owning campaign must be the URL's
  // campaign — a wrong chain redirects to the record's own URL.
  const campaignId = record.data?.campaign?.id;
  const chainMismatch =
    record.isSuccess && record.data !== undefined && campaignId !== id;
  useEffect(() => {
    if (record.data && chainMismatch) {
      void navigate({ to: recordRoute(record.data).to, params: recordRoute(record.data).params });
    }
  }, [record.data, chainMismatch, navigate]);
  if (chainMismatch) return null;
  return (
    <RecordPage
      key={chapterId}
      id={chapterId}
      initialEdit={initialEdit}
      kind="chapter"
      afterDeleteTo={{ to: "/campaigns/$id", params: { id } }}
      hideReferenceFields={["campaign"]}
    />
  );
}

/** Route entry — a Scene inside its chapter inside its campaign. */
export function SceneRecordPage() {
  const { id, chapterId, sceneId } = useParams({
    from: "/campaigns/$id/$chapterId/$sceneId",
  });
  const navigate = useNavigate();
  const initialEdit = useRouterState({
    select: (s) => s.location.search?.edit === "1" || s.location.search?.edit === true,
  });
  const record = useQuery({
    queryKey: ["record", sceneId],
    queryFn: () => api<Entity>(`/api/records/${sceneId}`),
    retry: false,
  });
  // Chain validation: the scene's owning campaign and chapter must match
  // the URL — a wrong chain redirects to the record's own URL.
  const chapterIdFromRefs = record.data?.references?.chapter?.[0]?.id;
  const chainMismatch =
    record.isSuccess &&
    record.data !== undefined &&
    (record.data.campaign?.id !== id || chapterIdFromRefs !== chapterId);
  useEffect(() => {
    if (record.data && chainMismatch) {
      void navigate({ to: recordRoute(record.data).to, params: recordRoute(record.data).params });
    }
  }, [record.data, chainMismatch, navigate]);
  if (chainMismatch) return null;
  return (
    <RecordPage
      key={sceneId}
      id={sceneId}
      initialEdit={initialEdit}
      kind="scene"
      afterDeleteTo={{ to: "/campaigns/$id/$chapterId", params: { id, chapterId } }}
      hideReferenceFields={["chapter"]}
    />
  );
}

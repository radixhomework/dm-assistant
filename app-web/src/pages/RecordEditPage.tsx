import { useQuery } from "@tanstack/react-query";
import { formString } from "../forms.js";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { RecordFormFields } from "../components/record-form-fields.js";
import { classifyField } from "../components/field-classify.js";
import { templateSchemaOf } from "@dm/schemas";
import { getWorldName } from "../api/auth.js";
import { ProseEditor } from "../editor/prose-editor.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { Entity } from "../types.js";

/**
 * Record page: opens in reading mode (PRE-SPEC.md §5 rule 10 flow) and an
 * explicit Edit action leads to the edit form; saving or cancelling
 * returns to the reading view. The bespoke per-template sheet replaces
 * the interim reading body at phase 9.
 */
export function RecordEditPage() {
  const { slug } = useParams({ from: "/records/$slug" });
  // validateSearch normalizes the edit=1 query flag to the boolean true;
  // accept both spellings so the creation forms' edit intent survives.
  const initialEdit = useRouterState({
    select: (s) => s.location.search?.edit === "1" || s.location.search?.edit === true,
  });
  // Remount per record: navigating slug → slug resets mode, body and
  // flags through the component lifecycle instead of competing effects.
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
  const [body, setBody] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);
  const record = useQuery({
    queryKey: ["record", slug],
    queryFn: () => api<Entity>(`/api/records/${slug}`),
    enabled: ready,
    retry: false,
  });

  // The editor owns the body once the record is loaded; changes flow
  // through onChange instead of FormData (one markdown source of truth).
  // Hooks stay above the early returns.
  useEffect(() => {
    if (record.data) {
      setBody(record.data.body);
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
  // The read view mounts its editor only once the body is known: TipTap
  // ignores content prop changes after mount, so mounting with "" would
  // show an empty record.
  if (body === null) return <p className="text-muted">{t("common.loading")}</p>;

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
          body: body ?? "",
        },
      });
      setSaved(true);
      await record.refetch();
      setMode("read");
    } catch (saveError) {
      setError(String(saveError));
    }
  }

  async function onDelete() {
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
        <h1 className="font-display text-4xl font-semibold text-ink">
          {data.title}
        </h1>
        <p className="mt-1 text-sm text-muted">{data.type}</p>
        <form onSubmit={onSave} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            {t("common.fields.title")}
            <input name="title" defaultValue={data.title} className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          {templateSchemaOf(data.type) ? (
            <RecordFormFields
              schema={templateSchemaOf(data.type)!}
              fields={fields ?? {}}
              onChange={setFields}
            />
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              {t("lore.fields")}
              <textarea name="fields" rows={8} defaultValue={fieldsJson} className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" />
            </label>
          )}
          <div className="flex flex-col gap-1 text-sm">
            <span>{t("lore.body")}</span>
            <ProseEditor markdown={body ?? ""} onChange={setBody} />
          </div>
          {error && <p className="text-sm text-radish">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
              {t("lore.save")}
            </button>
            <button
              type="button"
              onClick={() => setMode("read")}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-surface"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">
        {data.title}
      </h1>
      <p className="mt-1 text-sm text-muted">{data.type}</p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={enterEdit}
          className="rounded-md bg-primary px-4 py-2 text-sm text-background transition-colors duration-200 hover:bg-accent"
        >
          {t("record.edit")}
        </button>
        <button
          type="button"
          onClick={() => void onDelete()}
          className="rounded-md border border-border px-4 py-2 text-sm text-radish hover:bg-surface"
        >
          {t("lore.delete")}
        </button>
      </div>
      {saved && <p className="mt-3 text-sm text-primary">{t("lore.saved")}</p>}
      {error && <p className="mt-3 text-sm text-radish">{error}</p>}
      {(() => {
        // Interim reading sheet (phase 9 delivers the bespoke sheets):
        // filled template fields (empty means hidden), reference links,
        // then the rendered body.
        const template = templateSchemaOf(data.type);
        const shape = template
          ? (template.fields as unknown as { shape: Record<string, unknown> }).shape
          : {};
        const fieldRows: Array<{ key: string; label: string; node: React.ReactNode }> = [];
        // Field values are JSON primitives or nested structured objects
        // (money, dates, hp…) — primitives render as text, objects flatten
        // into a readable line.
        const entries = Object.entries(data.fields ?? {}) as Array<
          [string, string | number | boolean | object | null | undefined]
        >;
        for (const [key, value] of entries) {
          if (!(key in shape) || value === undefined || value === "" || value === null) continue;
          const kind = classifyField(key, shape[key]);
          const label = t(`fields.${key}`);
          if (kind === "statistics") continue; // rendered by the bespoke sheet
          if (kind === "enum") {
            const raw = value as string; // enum fields always store a string
            const translated = t(`enums.${key}.${raw}`, {
              defaultValue: raw.replaceAll("_", " "),
            });
            fieldRows.push({ key, label, node: translated });
            continue;
          }
          if (kind === "prose") {
            // The readonly editor renders markdown and resolves mention
            // links (title display, click opens the record in a new tab).
            fieldRows.push({
              key,
              label,
              node: <ProseEditor markdown={value as string} readonly />,
            });
            continue;
          }
          if (typeof value === "number") {
            fieldRows.push({ key, label, node: String(value) });
            continue;
          }
          if (typeof value === "object" && value !== null) {
            const object = value as Record<string, unknown>;
            const parts = Object.entries(object)
              .filter(([, part]) => part !== undefined && part !== "")
              .map((entry) => String(entry[1]));
            fieldRows.push({ key, label, node: parts.join(" — ") });
            continue;
          }
          fieldRows.push({ key, label, node: String(value) });
        }
        const referenceEntries = Object.entries(data.references ?? {}).filter(
          ([, targets]) => (targets as Array<{ slug: string }>).length > 0,
        );
        return (
          <div className="mt-6 flex flex-col gap-6">
            {fieldRows.length > 0 && (
              <dl className="record-read-fields">
                {fieldRows.map((row) => (
                  <div key={row.key} className="record-read-field">
                    <dt>{row.label}</dt>
                    <dd>{row.node}</dd>
                  </div>
                ))}
              </dl>
            )}
            {referenceEntries.length > 0 && (
              <dl className="record-read-fields">
                {referenceEntries.map(([fieldKey, targets]) => (
                  <div key={fieldKey} className="record-read-field">
                    <dt>{t(`fields.${fieldKey}`)}</dt>
                    <dd>
                      {(targets as Array<{ slug: string; title: string }>).map((target) => (
                        <Link
                          key={target.slug}
                          to="/records/$slug"
                          params={{ slug: target.slug }}
                          className="text-accent hover:underline"
                        >
                          {target.title}
                        </Link>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {body !== "" && <ProseEditor markdown={body} readonly />}
          </div>
        );
      })()}
    </div>
  );
}

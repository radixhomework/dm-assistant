import { useQuery } from "@tanstack/react-query";
import { formString } from "../forms.js";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { RecordFormFields } from "../components/record-form-fields.js";
import { classifyField } from "../components/field-classify.js";
import { useCalendarDefinition } from "../calendar/use-calendar.js";
import { templateSchemaOf, type CalendarDate } from "@dm/schemas";
import { getWorldName } from "../api/auth.js";
import { ProseEditor } from "../editor/prose-editor.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { Entity } from "../types.js";

/**
 * A structured calendar date rendered for the reading sheet: the day and
 * the month name from the world definition (fr: "12 M1 842"; en:
 * "M1 12, 842"), degrading to partial forms (month + year, year only).
 */
function CalendarDateText(props: { readonly value: CalendarDate }) {
  const { t } = useTranslation();
  const { definition } = useCalendarDefinition();
  const monthName =
    definition && props.value.month
      ? definition.months[props.value.month - 1]?.name
      : undefined;
  const params: Record<string, string | number> = { year: props.value.year };
  if (props.value.day !== undefined && monthName) params.day = props.value.day;
  if (monthName) params.month = monthName;
  else if (props.value.month !== undefined) params.month = props.value.month;
  return <>{t(dateFormatKey(params), params)}</>;
}

/** The format key matching the parts the date carries. */
function dateFormatKey(params: Record<string, string | number>): string {
  if (params.day !== undefined && params.month !== undefined) return "calendar.formatDay";
  if (params.month !== undefined) return "calendar.formatMonth";
  return "calendar.formatYear";
}

type FieldRow = { key: string; label: string; node: React.ReactNode };

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Builds the reading-sheet row of one template field: empty means
 * hidden, statistics belongs to the bespoke sheet, dates render through
 * the world definition, enums through their catalog, prose through the
 * readonly editor, objects flatten into one line. */
function buildFieldRow(args: {
  readonly key: string;
  readonly value: string | number | boolean | object | null | undefined;
  readonly shape: Record<string, unknown>;
  readonly label: string;
  readonly translate: Translate;
}): FieldRow | null {
  const { key, value, shape, label, translate } = args;
  if (!(key in shape) || value === undefined || value === "" || value === null) return null;
  const kind = classifyField(key, shape[key]);
  if (kind === "statistics") return null; // rendered by the bespoke sheet
  if (kind === "calendarDate") {
    // Dates render intelligibly via the world calendar definition.
    return { key, label, node: <CalendarDateText value={value as CalendarDate} /> };
  }
  if (kind === "enum") {
    const raw = value as string; // enum fields always store a string
    const translated = translate(`enums.${key}.${raw}`, {
      defaultValue: raw.replaceAll("_", " "),
    });
    return { key, label, node: translated };
  }
  if (kind === "prose") {
    // The readonly editor renders markdown and resolves mention links
    // (title display, click opens the record in a new tab).
    return { key, label, node: <ProseEditor markdown={value as string} readonly /> };
  }
  if (typeof value === "number") {
    return { key, label, node: String(value) };
  }
  if (typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>)
      .filter(([, part]) => part !== undefined && part !== "")
      .map((entry) => String(entry[1]));
    return { key, label, node: parts.join(" — ") };
  }
  return { key, label, node: String(value) };
}

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
  const record = useQuery({
    queryKey: ["record", slug],
    queryFn: () => api<Entity>(`/api/records/${slug}`),
    enabled: ready,
    retry: false,
  });
  // Backlinks feed the reading sheet's bottom section (phase 6).
  const backlinks = useQuery({
    queryKey: ["backlinks", slug],
    queryFn: () =>
      api<{
        fields: Record<string, Array<{ slug: string; title: string }>>;
        mentions: Array<{ slug: string; title: string }>;
      }>(`/api/records/${slug}/backlinks`),
    enabled: ready,
  });

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
        // filled template fields (empty means hidden), then reference
        // links.
        const template = templateSchemaOf(data.type);
        const shape = template
          ? (template.fields as unknown as { shape: Record<string, unknown> }).shape
          : {};
        // Field values are JSON primitives or nested structured objects
        // (money, dates, hp…) — primitives render as text, objects flatten
        // into a readable line.
        const entries = Object.entries(data.fields ?? {}) as Array<
          [string, string | number | boolean | object | null | undefined]
        >;
        const fieldRows = entries
          .map(([key, value]) =>
            buildFieldRow({
              key,
              value,
              shape,
              label: t(`fields.${key}`),
              translate: t as unknown as Translate,
            }),
          )
          .filter((row) => row !== null);
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
          </div>
        );
      })()}
      {backlinks.data && (
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="font-display text-2xl text-ink">{t("record.backlinks")}</h2>
          {(() => {
            const groups = Object.entries(backlinks.data.fields);
            const nothing =
              groups.length === 0 && backlinks.data.mentions.length === 0;
            if (nothing) {
              return <p className="mt-2 text-muted">{t("record.noBacklinks")}</p>;
            }
            return (
              <dl className="record-read-fields mt-2">
                {groups.map(([fieldKey, targets]) => (
                  <div key={fieldKey} className="record-read-field">
                    <dt>{t(`fields.${fieldKey}`)}</dt>
                    <dd>
                      {targets.map((target) => (
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
                {backlinks.data.mentions.length > 0 && (
                  <div className="record-read-field">
                    <dt>{t("record.incomingMentions")}</dt>
                    <dd>
                      {backlinks.data.mentions.map((mention) => (
                        <Link
                          key={mention.slug}
                          to="/records/$slug"
                          params={{ slug: mention.slug }}
                          className="text-accent hover:underline"
                        >
                          {mention.title}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            );
          })()}
        </section>
      )}
    </div>
  );
}

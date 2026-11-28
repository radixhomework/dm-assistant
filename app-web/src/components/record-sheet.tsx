import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useCalendarDefinition } from "../calendar/use-calendar.js";
import { classifyField } from "./field-classify.js";
import { ProseEditor } from "../editor/prose-editor.js";
import { templateSchemaOf } from "@dm/schemas";
import { useRecordRoute } from "../urls.js";
import { catalogTemplates } from "../types.js";
import type { CalendarDate } from "@dm/schemas";
import type { Entity } from "../types.js";

/**
 * The reading-sheet scaffold (records-editor 9.1): template-shaped fields
 * (empty means hidden), references, children and backlinks at the end. A
 * bespoke per-template sheet takes over the field area through the
 * `slot` prop (decision 11); the scaffold keeps the shared sections.
 */

type FieldRow = { key: string; label: string; node: React.ReactNode };
type Translate = (key: string, options?: Record<string, unknown>) => string;

type Backlinks = {
  fields: Record<
    string,
    Array<{ id: string; slug: string; title: string; type: string; perimeter: string }>
  >;
  mentions: Array<{
    id: string;
    slug: string;
    title: string;
    type: string;
    perimeter: string;
  }>;
};

/** Links to records, sorted alphabetically by title (not slug) and
 * separated by commas. */
/** One record link resolved through the target's uuid — the route
 * depends on the target's domain (Lore or campaign hierarchy). */
function RecordLink(props: {
  readonly target: { id: string; slug: string; title: string };
}) {
  const { t } = useTranslation();
  const { route, isError, isFetching, refetch } = useRecordRoute(props.target);
  if (!route) {
    return (
      <span className="text-muted">
        {props.target.title}{" "}
        {isError && !isFetching ? (
          <>
            <span role="status">({t("common.error")})</span>{" "}
            <button
              type="button"
              onClick={() => void refetch()}
              aria-label={t("record.retryLink", { title: props.target.title })}
              className="text-accent underline"
            >
              {t("common.retry")}
            </button>
          </>
        ) : <span role="status">({t("common.loading")})</span>}
      </span>
    );
  }
  return (
    <Link
      to={route.to}
      params={route.params}
      className="text-accent hover:underline"
    >
      {props.target.title}
    </Link>
  );
}

export function TitleLinks(props: {
  readonly targets: Array<{ id: string; slug: string; title: string }>;
}) {
  const sorted = [...props.targets].sort((a, b) =>
    a.title.localeCompare(b.title, "fr"),
  );
  return (
    <>
      {sorted.map((target, index) => (
        <Fragment key={target.slug}>
          {index > 0 && ", "}
          <RecordLink target={target} />
        </Fragment>
      ))}
    </>
  );
}

/** A structured calendar date rendered through the world calendar
 * definition (fr: "12 M1 842"; en: "M1 12, 842"), degrading to partial
 * forms (month + year, year only). */
function CalendarDateText(props: { readonly value: CalendarDate }) {
  const { t } = useTranslation();
  const { definition } = useCalendarDefinition();
  const monthName =
    definition && props.value.month
      ? definition.months[props.value.month - 1]?.name
      : undefined;
  const params: Record<string, string | number> = { year: props.value.year };
  const monthValue = monthName ?? props.value.month;
  if (props.value.day !== undefined) params.day = props.value.day;
  // A partial date renders at its own granularity: the month parameter
  // stays absent for year-only dates so the year format applies.
  if (monthValue !== undefined) params.month = monthValue;
  const prefix = props.value.era ? `${props.value.era} ` : "";
  return (
    <>
      {prefix}
      {t(dateFormatKey(params), params)}
    </>
  );
}

function dateFormatKey(params: Record<string, string | number>): string {
  if (params.day !== undefined && params.month !== undefined) return "calendar.formatDay";
  if (params.month !== undefined) return "calendar.formatMonth";
  return "calendar.formatYear";
}

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
  if (kind === "statistics") return null; // the bespoke sheet renders it
  if (kind === "calendarDate") {
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

/** The title of the children section, by parent type. */
function childrenTitleKey(type: string): string | null {
  if (type === "campaign") return "campaigns.chapters";
  if (type === "chapter") return "campaigns.scenes";
  return null;
}

export function RecordSheet(props: {
  readonly record: Entity;
  /** The bespoke per-template sheet; replaces the generic field rows. */
  readonly slot?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { record } = props;
  const template = templateSchemaOf(record.type);
  const shape = template
    ? (template.fields as unknown as { shape: Record<string, unknown> }).shape
    : {};
  const backlinks = useQuery({
    queryKey: ["backlinks", record.slug],
    queryFn: () => api<Backlinks>(`/api/records/${record.slug}/backlinks`),
  });

  const childrenKey = childrenTitleKey(record.type);
  const children = record.tracking?.children ?? [];
  const catalogTypes = catalogTemplates as readonly string[];
  const showSourceBadge = record.source !== undefined && record.source !== null && catalogTypes.includes(record.type);

  return (
    <div className="mt-6">
      {/* Provenance badge (srd-catalog-import spec): the built-in
       * Internal source renders its i18n label; an external badge names
       * its source and leads to the attribution page. Non-catalog
       * records carry no badge, and a disabled source keeps showing
       * its records' badges. */}
      {showSourceBadge && record.source && (
        <div className="mb-3">
          {record.source.internal ? (
            <span className="inline-block rounded-sm border border-border bg-surface px-1.5 py-0.5 text-xs text-muted">
              {t("record.source.internal")}
            </span>
          ) : (
            <Link
              to="/attribution"
              className="inline-block rounded-sm border border-border bg-surface px-1.5 py-0.5 text-xs text-muted transition-colors duration-200 hover:text-accent"
              title={t("record.source.attributionTitle")}
            >
              {record.source.name}
            </Link>
          )}
        </div>
      )}
      {/* The tags chips: instance-level metadata, hidden when the record
       * carries none (empty means hidden). */}
      {record.tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {record.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {props.slot ?? <GenericFieldRows record={record} shape={shape} />}
      {childrenKey !== null && (
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="font-display text-2xl text-ink">{t(childrenKey)}</h2>
          {children.length === 0 ? (
            <p className="mt-2 text-muted">{t("record.noChildren")}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {children.map((child) => {
                // Children are hierarchy records: a campaign's chapters
                // live at /campaigns/<campaign>/<chapter>, a chapter's
                // scenes one level deeper.
                const route =
                  record.type === "campaign"
                    ? { to: "/campaigns/$id/$chapterId", params: { id: record.id, chapterId: child.id } }
                    : {
                        to: "/campaigns/$id/$chapterId/$sceneId",
                        params: {
                          id: record.campaign?.id ?? record.id,
                          chapterId: record.id,
                          sceneId: child.id,
                        },
                      };
                return (
                  <li key={child.slug}>
                    <Link
                      to={route.to}
                      params={route.params}
                      className="text-accent hover:underline"
                    >
                      {child.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
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
                      <TitleLinks targets={targets} />
                    </dd>
                  </div>
                ))}
                {backlinks.data.mentions.length > 0 && (
                  <div className="record-read-field">
                    <dt>{t("record.incomingMentions")}</dt>
                    <dd>
                      <TitleLinks targets={backlinks.data.mentions} />
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

/** The generic field rows: filled fields in template order, references.
 * No body — the templates define every field (decision 14). */
function GenericFieldRows(props: {
  readonly record: Entity;
  readonly shape: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const { record, shape } = props;
  const entries = Object.entries(record.fields ?? {}) as Array<
    [string, string | number | boolean | object | null | undefined]
  >;
  // Prose fields render as headed sections (no boxed frame — the heading
  // separates the sections); the other fields stay as label/value rows.
  const blocks: React.ReactNode[] = [];
  let plainRows: FieldRow[] = [];
  const flushRows = () => {
    if (plainRows.length > 0) {
      const rows = plainRows;
      blocks.push(
        <dl key={`rows-${blocks.length}`} className="record-read-fields">
          {rows.map((row) => (
            <div key={row.key} className="record-read-field">
              <dt>{row.label}</dt>
              <dd>{row.node}</dd>
            </div>
          ))}
        </dl>,
      );
      plainRows = [];
    }
  };
  for (const [key, value] of entries) {
    const row = buildFieldRow({
      key,
      value,
      shape,
      label: t(`fields.${key}`),
      translate: t as unknown as Translate,
    });
    if (row === null) continue;
    if (classifyField(key, shape[key]) === "prose") {
      flushRows();
      blocks.push(
        <section key={key} className="mt-8">
          <h2 className="font-display text-2xl text-ink">{row.label}</h2>
          <div className="mt-2">
            <ProseEditor markdown={value as string} readonly frame={false} />
          </div>
        </section>,
      );
      continue;
    }
    plainRows.push(row);
  }
  flushRows();
  const referenceEntries = Object.entries(record.references ?? {}).filter(
    ([, targets]) => (targets as Array<{ slug: string }>).length > 0,
  );
  return (
    <div>
      {blocks}
      {referenceEntries.length > 0 && (
        <dl className="record-read-fields">
          {referenceEntries.map(([fieldKey, targets]) => (
            <div key={fieldKey} className="record-read-field">
              <dt>{t(`fields.${fieldKey}`)}</dt>
              <dd>
                <TitleLinks targets={targets as Array<{ id: string; slug: string; title: string }>} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

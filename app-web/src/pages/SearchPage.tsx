import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchSearch, fetchTags, type SearchHit } from "../api/search.js";
import { categoryLabelKey } from "../categories.js";
import { useRecordRoute } from "../urls.js";
import { useRequireAuth } from "./useRequireAuth.js";
import { catalogTemplates, worldTemplates } from "../types.js";

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * The ts_headline delimiters (⟦ ⟧ — chosen in the search service to be
 * absent from lore prose) split into plain text and highlighted
 * fragments with stable keys (content + position): the snippet is never
 * rendered as HTML.
 */
type SnippetFragment = { id: string; text: string; highlighted: boolean };

function snippetFragments(text: string): SnippetFragment[] {
  const parts = text.split(/([⟦⟧])/);
  const fragments: SnippetFragment[] = [];
  let highlighted = false;
  let position = 0;
  for (const part of parts) {
    if (part === "⟦") {
      highlighted = true;
      continue;
    }
    if (part === "⟧") {
      highlighted = false;
      continue;
    }
    if (part.length > 0) {
      fragments.push({ id: `${position}:${part}`, text: part, highlighted });
    }
    position += 1;
  }
  return fragments;
}

function Snippet(props: { readonly text: string }) {
  return (
    <>
      {snippetFragments(props.text).map((fragment) =>
        fragment.highlighted ? (
          <mark
            key={fragment.id}
            className="rounded-sm bg-accent/30 px-0.5 text-ink"
          >
            {fragment.text}
          </mark>
        ) : (
          <span key={fragment.id}>{fragment.text}</span>
        ),
      )}
    </>
  );
}

/** The unresolved-route title states, split out of the row ternary
 * (Sonar S3358). */
function UnresolvedTitle(props: {
  readonly title: string;
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly refetch: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  if (props.isError && !props.isFetching) {
    return (
      <span className="font-display text-xl font-semibold text-ink">
        {props.title}{" "}
        <output>({t("common.error")})</output>{" "}
        <button
          type="button"
          onClick={() => void props.refetch()}
          aria-label={t("record.retryLink", { title: props.title })}
          className="text-accent underline"
        >
          {t("common.retry")}
        </button>
      </span>
    );
  }
  return (
    <span className="font-display text-xl font-semibold text-ink">
      {props.title} <output>({t("common.loading")})</output>
    </span>
  );
}

/** One result row: the record's domain route resolves lazily from the
 * hit's uuid — world records land at /lore/<uuid>, campaign records in
 * their hierarchy. */
function SearchResultRow(props: { readonly hit: SearchHit }) {
  const { t } = useTranslation();
  const { route, isError, isFetching, refetch } = useRecordRoute({
    id: props.hit.id,
  });
  return (
    <li className="border-b border-border py-3">
      <div className="flex items-baseline gap-2">
        {route ? (
          <Link
            to={route.to}
            params={route.params}
            className="font-display text-xl font-semibold text-ink hover:text-accent"
          >
            {props.hit.title}
          </Link>
        ) : (
          <UnresolvedTitle
            title={props.hit.title}
            isError={isError}
            isFetching={isFetching}
            refetch={refetch}
          />
        )}
        <span className="text-sm text-muted">
          {t(categoryLabelKey(props.hit.type))}
        </span>
      </div>
      {props.hit.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {props.hit.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-1 text-sm leading-relaxed text-muted">
        <Snippet text={props.hit.snippet} />
      </p>
    </li>
  );
}

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const params = useSearch({ from: "/search" });
  const q = params.q ?? "";

  // The input drafts locally; the debounced value drives the URL (the
  // source of truth) and the query key.
  const [draft, setDraft] = useState(q);
  const debouncedDraft = useDebouncedValue(draft);
  // The route is the source of truth: an external q change (a pasted
  // link, a back-navigation) re-seeds the draft instead of being
  // overwritten by the stale debounced value (CodeRabbit round-1
  // review).
  useEffect(() => {
    setDraft(q);
  }, [q]);
  useEffect(() => {
    if (debouncedDraft !== q) {
      void navigate({
        to: "/search",
        search: (previous: { type?: string; tag?: string }) => ({
          ...previous,
          q: debouncedDraft,
        }),
        replace: true,
      });
    }
  }, [debouncedDraft, q, navigate]);
  // The page's whole purpose is search: focus the field on arrival
  // through a ref — the autoFocus attribute is flagged by S9379.
  const queryInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    queryInputRef.current?.focus();
  }, []);

  const results = useQuery({
    queryKey: ["search", q, params.type, params.tag],
    queryFn: () => fetchSearch({ q, type: params.type, tag: params.tag }),
    enabled: ready && q.trim().length > 0,
  });
  const tags = useQuery({ queryKey: ["tags"], queryFn: fetchTags, enabled: ready });

  function setFilter(key: "type" | "tag", value: string) {
    void navigate({
      to: "/search",
      search: (previous: { q?: string; type?: string; tag?: string }) => ({
        ...previous,
        [key]: value === "" ? undefined : value,
      }),
      replace: true,
    });
  }

  if (!ready) return null;
  const hits = results.data ?? [];

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between gap-4 border-b border-border bg-background px-6 pb-3 pt-5">
        <h1 className="font-display text-4xl font-semibold text-ink">
          {t("search.title")}
        </h1>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <input
          type="search"
          ref={queryInputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.title")}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            {t("search.filterType")}
            <select
              value={params.type ?? ""}
              onChange={(event) => setFilter("type", event.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-ink"
            >
              <option value="">{t("search.allTypes")}</option>
              {[...worldTemplates, ...catalogTemplates, "campaign", "chapter", "scene"].map(
                (template) => (
                  <option key={template} value={template}>
                    {t(categoryLabelKey(template))}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            {t("search.filterTag")}
            <select
              value={params.tag ?? ""}
              onChange={(event) => setFilter("tag", event.target.value)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-ink"
            >
              <option value="">{t("search.allTags")}</option>
              {(tags.data ?? []).map((entry) => (
                <option key={entry.tag} value={entry.tag}>
                  {entry.tag}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {(() => {
        // A flat branch chain: no nested ternaries (Sonar S3358), and
        // the failed-search state stays distinct from no-results
        // (CodeRabbit round-1 review).
        if (q.trim().length === 0) {
          return <p className="mt-6 text-muted">{t("search.hint")}</p>;
        }
        if (results.isPending) {
          return <p className="mt-6 text-muted">{t("common.loading")}</p>;
        }
        if (results.isError) {
          return (
            <p className="mt-6 text-muted">
              {t("search.error")}{" "}
              <button
                type="button"
                onClick={() => void results.refetch()}
                className="text-accent underline"
              >
                {t("common.retry")}
              </button>
            </p>
          );
        }
        if (hits.length === 0) {
          return (
            <p className="mt-6 text-muted">
              {t("search.noResults", { query: q })}
            </p>
          );
        }
        return (
          <>
            <p className="mt-6 text-sm text-muted">
              {t("search.resultsCount", { count: hits.length })}
            </p>
            <ul className="mt-2">
              {hits.map((hit) => (
                <SearchResultRow key={hit.id} hit={hit} />
              ))}
            </ul>
          </>
        );
      })()}
    </div>
  );
}

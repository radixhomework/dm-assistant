import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { categoryIcons, categoryLabelKey } from "../categories.js";
import { worldTemplates, type Entity } from "../types.js";

/**
 * Persistent left sidebar: record categories (same labels, icons and
 * order as the Lore page) expanding to record links. Categories start
 * collapsed (session-only viewing preference); the record matching the
 * current route — reading or editing view — is highlighted together
 * with its category header. Consumes the same ["lore-records"] query
 * cache as the Lore page: one fetch, shared.
 */
export function AppSidebar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const records = useQuery({
    queryKey: ["lore-records"],
    queryFn: () => api<Entity[]>("/api/records?perimeter=world"),
    retry: false,
  });
  // Categories start collapsed; the set tracks the expanded ones.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  // The active record (reading or editing view: /records/<slug>), from
  // which the highlighted category header is derived.
  const recordMatch = /^\/records\/([^/]+)$/.exec(pathname);
  const activeSlug = recordMatch ? decodeURIComponent(recordMatch[1]) : null;
  // The query starts undefined and stubs may answer non-arrays; only a
  // real list feeds the grouping.
  const list = Array.isArray(records.data) ? records.data : [];
  const byType = new Map<string, Entity[]>();
  for (const record of list) {
    byType.set(record.type, [...(byType.get(record.type) ?? []), record]);
  }
  const activeType = list.find((record) => record.slug === activeSlug)?.type ?? null;

  return (
    <nav aria-label={t("nav.sidebar")} className="flex flex-col gap-1 py-2">
      {worldTemplates.map((type) => {
        const typeRecords = byType.get(type) ?? [];
        const isCollapsed = !expanded.has(type);
        const containsActive = activeType === type;
        const Icon = categoryIcons[type];
        return (
          <section key={type}>
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(type)) next.delete(type);
                  else next.add(type);
                  return next;
                })
                // Highlight the category header holding the active record
                // even while collapsed (spec: header + entry highlighted).
              }
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-200 ${
                containsActive
                  ? "bg-accent/20 text-ink"
                  : "text-muted hover:bg-surface"
              }`}
            >
              {Icon && <Icon className="size-4 shrink-0 text-accent" aria-hidden />}
              <span className="flex-1 truncate text-sm font-medium">
                {t(categoryLabelKey(type))}
              </span>
              <span className="text-xs text-muted">({typeRecords.length})</span>
              <span className="text-xs text-muted">{isCollapsed ? "▸" : "▾"}</span>
            </button>
            {!isCollapsed && (
              <ul className="mt-0.5 mb-1 flex flex-col gap-0.5 pl-4">
                {typeRecords.map((record) => {
                  const active = record.slug === activeSlug;
                  return (
                    <li key={record.slug}>
                      <Link
                        to="/records/$slug"
                        params={{ slug: record.slug }}
                        className={`block truncate rounded-md px-2 py-1 text-sm transition-colors duration-200 ${
                          active
                            ? "bg-accent text-background"
                            : "text-ink hover:bg-surface"
                        }`}
                      >
                        {record.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </nav>
  );
}

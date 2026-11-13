import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "../api/client.js";
import type { ChildView, Entity } from "../types.js";

const activeClass = "bg-accent text-background";
const idleClass = "text-ink hover:bg-surface";

/** Scene (and deeper) entries: plain links, always visible. */
function TreeEntries(props: {
  readonly nodes: ChildView[];
  readonly activeSlug: string | null;
}) {
  return (
    <ul className="flex flex-col gap-0.5 pl-6">
      {props.nodes.map((node) => {
        const active = node.slug === props.activeSlug;
        const children = node.children ?? [];
        return (
          <li key={node.slug}>
            <Link
              to="/records/$slug"
              params={{ slug: node.slug }}
              className={`block truncate rounded-md px-2 py-1 text-sm transition-colors duration-200 ${
                active ? activeClass : idleClass
              }`}
            >
              {node.title}
            </Link>
            {children.length > 0 && (
              <TreeEntries nodes={children} activeSlug={props.activeSlug} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Campaign-context sidebar: the opened campaign's chapters with their
 * scenes nested underneath (from the recursive tracking tree). Chapters
 * are collapsible — expanded by default, folded by their chevron. Shares
 * the ["campaign-view", slug] query cache with the campaign view page —
 * no extra fetch when arriving from it.
 */
export function CampaignSidebar(props: {
  readonly campaignSlug: string;
  readonly activeSlug: string | null;
}) {
  const { t } = useTranslation();
  const campaign = useQuery({
    queryKey: ["campaign-view", props.campaignSlug],
    queryFn: () =>
      api<Entity & { tracking?: { children?: ChildView[] } }>(
        `/api/records/${props.campaignSlug}`,
      ),
  });
  // Chapters expand by default; the set tracks the collapsed ones.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const campaignActive = props.activeSlug === props.campaignSlug;
  const chapters = campaign.data?.tracking?.children ?? [];
  return (
    <nav aria-label={t("nav.sidebar")} className="flex flex-col gap-1 py-2">
      <Link
        to="/campaigns/$slug"
        params={{ slug: props.campaignSlug }}
        className={`block truncate rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-200 ${
          campaignActive ? activeClass : "text-muted hover:bg-surface"
        }`}
      >
        {campaign.data?.title ?? props.campaignSlug}
      </Link>
      <ul className="flex flex-col gap-0.5">
        {chapters.map((chapter) => {
          const active = chapter.slug === props.activeSlug;
          const scenes = chapter.children ?? [];
          const isCollapsed = collapsed.has(chapter.slug);
          return (
            <li key={chapter.slug}>
              <div className="flex items-center">
                <Link
                  to="/records/$slug"
                  params={{ slug: chapter.slug }}
                  className={`block min-w-0 flex-1 truncate rounded-md px-2 py-1 text-sm transition-colors duration-200 ${
                    active ? activeClass : idleClass
                  }`}
                >
                  {chapter.title}
                </Link>
                {scenes.length > 0 && (
                  <button
                    type="button"
                    aria-label={chapter.title}
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsed((current) => {
                        const next = new Set(current);
                        if (next.has(chapter.slug)) next.delete(chapter.slug);
                        else next.add(chapter.slug);
                        return next;
                      })
                    }
                    className="rounded-md p-1 text-muted transition-colors duration-200 hover:bg-surface hover:text-ink"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-4" aria-hidden />
                    ) : (
                      <ChevronDown className="size-4" aria-hidden />
                    )}
                  </button>
                )}
              </div>
              {!isCollapsed && scenes.length > 0 && (
                <TreeEntries nodes={scenes} activeSlug={props.activeSlug} />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

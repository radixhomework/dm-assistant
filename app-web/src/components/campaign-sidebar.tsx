import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "../api/client.js";
import type { ChildView, Entity } from "../types.js";

const activeClass = "bg-accent text-background";
const idleClass = "text-ink hover:bg-surface";

function statusColor(status: string): string {
  if (status === "played") return "text-primary";
  if (status === "in_progress") return "text-accent";
  return "text-muted";
}

/** The status glyph shapes, looked up instead of nested ternaries. */
const statusShapes: Record<string, React.ReactNode> = {
  played: <circle cx="8" cy="8" r="5.5" fill="currentColor" />,
  in_progress: (
    <>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3.5 A4.5 4.5 0 0 0 8 12.5 Z" fill="currentColor" />
    </>
  ),
  not_played: (
    <circle
      cx="8"
      cy="8"
      r="5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="2.4 2.4"
    />
  ),
};

/** Play-status marker: dashed empty circle (not played), half-filled
 * circle (in progress), filled circle (played). */
function StatusDot(props: { readonly status: string }) {
  const { t } = useTranslation();
  return (
    <span
      role="img"
      aria-label={t(`campaigns.status.${props.status}`)}
      title={t(`campaigns.status.${props.status}`)}
      className={`inline-flex shrink-0 ${statusColor(props.status)}`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden fill="none">
        {statusShapes[props.status] ?? statusShapes.not_played}
      </svg>
    </span>
  );
}

/** Scene entries: plain links under their chapter, always visible. */
function TreeEntries(props: {
  readonly nodes: ChildView[];
  readonly campaignId: string;
  readonly chapterId: string;
  readonly activeId: string | null;
}) {
  return (
    <ul className="flex flex-col gap-0.5 pl-6">
      {props.nodes.map((node) => {
        const active = node.id === props.activeId;
        const children = node.children ?? [];
        return (
          <li key={node.slug}>
            <Link
              to="/campaigns/$id/$chapterId/$sceneId"
              params={{
                id: props.campaignId,
                chapterId: props.chapterId,
                sceneId: node.id,
              }}
              className={`flex items-center gap-1.5 truncate rounded-md px-2 py-1 text-sm transition-colors duration-200 ${
                active ? activeClass : idleClass
              }`}
            >
              <StatusDot status={node.status} />
              <span className="truncate">{node.title}</span>
            </Link>
            {children.length > 0 && (
              <TreeEntries
                nodes={children}
                campaignId={props.campaignId}
                chapterId={props.chapterId}
                activeId={props.activeId}
              />
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
  readonly campaignId: string;
  readonly activeId: string | null;
}) {
  const { t } = useTranslation();
  const campaign = useQuery({
    queryKey: ["campaign-view", props.campaignId],
    queryFn: () =>
      api<Entity & { tracking?: { children?: ChildView[] } }>(
        `/api/records/${props.campaignId}`,
      ),
  });
  // Chapters expand by default; the set tracks the collapsed ones.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const campaignActive = props.activeId === props.campaignId;
  const chapters = campaign.data?.tracking?.children ?? [];
  return (
    <nav aria-label={t("nav.sidebar")} className="flex flex-col gap-1 py-2">
      <Link
        to="/campaigns/$id"
        params={{ id: props.campaignId }}
        className={`block truncate rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-200 ${
          campaignActive ? activeClass : "text-muted hover:bg-surface"
        }`}
      >
        {campaign.data?.title ?? props.campaignId}
      </Link>
      <ul className="flex flex-col gap-0.5">
        {chapters.map((chapter) => {
          const active = chapter.id === props.activeId;
          const scenes = chapter.children ?? [];
          const isCollapsed = collapsed.has(chapter.slug);
          return (
            <li key={chapter.slug}>
              <div className="flex items-center">
                <Link
                  to="/campaigns/$id/$chapterId"
                  params={{ id: props.campaignId, chapterId: chapter.id }}
                  className={`flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-md px-2 py-1 text-sm transition-colors duration-200 ${
                    active ? activeClass : idleClass
                  }`}
                >
                  <StatusDot status={chapter.status} />
                  <span className="truncate">{chapter.title}</span>
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
                <TreeEntries
                  nodes={scenes}
                  campaignId={props.campaignId}
                  chapterId={chapter.id}
                  activeId={props.activeId}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

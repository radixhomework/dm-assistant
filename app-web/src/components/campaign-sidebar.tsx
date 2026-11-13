import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import type { ChildView, Entity } from "../types.js";

const activeClass = "bg-accent text-background";
const idleClass = "text-ink hover:bg-surface";

function TreeEntries(props: {
  readonly nodes: ChildView[];
  readonly activeSlug: string | null;
  readonly nested: boolean;
}) {
  return (
    <ul className={`flex flex-col gap-0.5 ${props.nested ? "pl-4" : ""}`}>
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
              <TreeEntries nodes={children} activeSlug={props.activeSlug} nested />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Campaign-context sidebar: the opened campaign's chapters and their
 * scenes as links, from the recursive tracking tree. Shares the
 * ["campaign-view", slug] query cache with the campaign view page — no
 * extra fetch when arriving from it.
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
  const campaignActive = props.activeSlug === props.campaignSlug;
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
      {(campaign.data?.tracking?.children ?? []).length > 0 && (
        <TreeEntries
          nodes={campaign.data?.tracking?.children ?? []}
          activeSlug={props.activeSlug}
          nested={false}
        />
      )}
    </nav>
  );
}

import { useQuery } from "@tanstack/react-query";
import { api } from "./api/client.js";
import type { Entity } from "./types.js";

/** A typed route to a record page: the to-pattern plus its params. */
export type RecordRoute = { to: string; params: Record<string, string> };

export function loreRoute(id: string): RecordRoute {
  return { to: "/lore/$id", params: { id } };
}

export function campaignRoute(campaignId: string): RecordRoute {
  return { to: "/campaigns/$id", params: { id: campaignId } };
}

export function chapterRoute(
  campaignId: string,
  chapterId: string,
): RecordRoute {
  return {
    to: "/campaigns/$id/$chapterId",
    params: { id: campaignId, chapterId },
  };
}

export function sceneRoute(
  campaignId: string,
  chapterId: string,
  sceneId: string,
): RecordRoute {
  return {
    to: "/campaigns/$id/$chapterId/$sceneId",
    params: { id: campaignId, chapterId, sceneId },
  };
}

/**
 * The route of any record, from the payloads the API returns: a world
 * record lives at /lore/<uuid>; campaign-perimeter records live in
 * their hierarchy — the owning campaign comes from the payload's
 * `campaign` and a scene's chapter from its `references.chapter`.
 */
export function recordRoute(record: {
  id: string;
  type: string;
  perimeter: string;
  campaign?: { id?: string } | null;
  references?: Record<string, Array<{ id: string }>> | null;
}): RecordRoute {
  if (record.perimeter === "campaign") {
    const campaignId = record.campaign?.id;
    if (record.type === "campaign") return campaignRoute(record.id);
    if (!campaignId) return campaignRoute(record.id);
    if (record.type === "chapter") return chapterRoute(campaignId, record.id);
    if (record.type === "scene") {
      const chapterId = record.references?.chapter?.[0]?.id;
      if (!chapterId) return campaignRoute(campaignId);
      return sceneRoute(campaignId, chapterId, record.id);
    }
    return campaignRoute(campaignId);
  }
  return loreRoute(record.id);
}

/**
 * Resolves a record's route lazily from its uuid — for navigation
 * surfaces that only carry a partial target (backlinks rows, mention
 * triggers, tracking children). The fetch shares the record page's
 * query cache; hierarchy chains never change, so a cached route stays
 * valid.
 */
export function useRecordRoute(
  target: { readonly id: string } | undefined | null,
) {
  const id = target?.id;
  const query = useQuery({
    queryKey: ["record", id],
    queryFn: () => api<Entity>(`/api/records/${id}`),
    enabled: id !== undefined,
    staleTime: Infinity,
  });
  return {
    route: query.data ? recordRoute(query.data) : null,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

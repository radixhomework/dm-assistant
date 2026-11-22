import { api } from "./client.js";

export type SearchHit = {
  id: string;
  slug: string;
  title: string;
  type: string;
  perimeter: "world" | "campaign";
  tags: string[];
  snippet: string;
};

export type TagInventoryEntry = { tag: string; count: number };

/** Full-text search over records (accent-insensitive server-side). */
export async function fetchSearch(params: {
  q: string;
  type?: string;
  tag?: string;
}): Promise<SearchHit[]> {
  const search = new URLSearchParams({ q: params.q });
  if (params.type) search.set("type", params.type);
  if (params.tag) search.set("tag", params.tag);
  return api<SearchHit[]>(`/api/search?${search.toString()}`);
}

export async function fetchTags(): Promise<TagInventoryEntry[]> {
  return api<TagInventoryEntry[]>("/api/tags");
}

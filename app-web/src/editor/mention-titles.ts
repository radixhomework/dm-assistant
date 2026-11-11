import { api } from "../api/client.js";

/**
 * Title resolution cache for mention display: slug → title, null when the
 * target does not exist (dead link). Session-scoped — a renamed title
 * refreshes on the next full page load.
 */
const titleCache = new Map<string, string | null>();

const inflight = new Map<string, Promise<string | null>>();

/** Resolves a mention slug to the record's current title (cached). */
export async function resolveTitle(slug: string): Promise<string | null> {
  const cached = titleCache.get(slug);
  if (cached !== undefined) return cached;
  const pending = inflight.get(slug);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const record = await api<{ title: string }>(`/api/records/${encodeURIComponent(slug)}`);
      titleCache.set(slug, record.title);
      return record.title;
    } catch {
      // 404: the target is gone — the mention renders as a dead link.
      titleCache.set(slug, null);
      return null;
    }
  })();
  inflight.set(slug, promise);
  const resolved = await promise;
  inflight.delete(slug);
  return resolved;
}

/** Test helper: resets the cache between cases. */
export function clearTitleCache(): void {
  titleCache.clear();
  inflight.clear();
}

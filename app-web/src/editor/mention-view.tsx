import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";

/**
 * Title resolution cache: slug → title, null when the target does not
 * exist (dead link). Session-scoped; a renamed title refreshes on the
 * next full page load.
 */
const titleCache = new Map<string, string | null>();

const inflight = new Map<string, Promise<string | null>>();

async function resolveTitle(slug: string): Promise<string | null> {
  const cached = titleCache.get(slug);
  if (cached !== undefined || inflight.has(slug)) return cached ?? (inflight.get(slug) as Promise<string | null>);
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

/**
 * Reading view of a mention: displays the referenced record's current
 * title (dynamic resolution — renames follow without rewriting), falling
 * back to the slug while loading and an explicit dead-link style when
 * the target is gone. No "@" prefix in reading mode — the title reads as
 * prose. The data attributes keep the container click handler (open the
 * record in a new tab) working.
 */
export function MentionView(props: NodeViewProps) {
  const slug = props.node.attrs.id as string;
  const label = props.node.attrs.label as string | null;
  const [title, setTitle] = useState<string | null>(label);

  useEffect(() => {
    let cancelled = false;
    void resolveTitle(slug).then((resolved) => {
      if (!cancelled) setTitle(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const dead = title === null;
  // The @ prefix marks the mention while typing; the reading view shows
  // the referenced record's title as plain prose.
  const prefix = props.editor.isEditable ? "@" : "";
  return (
    <NodeViewWrapper
      as="span"
      data-type="mention"
      data-id={slug}
      className={dead ? "mention dead-link" : "mention"}
    >
      {dead ? `${prefix}${slug}` : `${prefix}${title}`}
    </NodeViewWrapper>
  );
}

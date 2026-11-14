import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { resolveTitle } from "./mention-titles.js";

/**
 * Reading view of a mention: displays the referenced record's current
 * title (dynamic resolution — renames follow without rewriting), falling
 * back to the slug while loading and an explicit dead-link style when
 * the target is gone. No "@" prefix in reading mode — the title reads as
 * prose. The data attributes keep the container click handler (open the
 * record in a new tab) working.
 */
export function MentionView(props: Readonly<NodeViewProps>) {
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
  // Resolved mentions read as plain prose in reading mode (no @ prefix);
  // dead links keep the @ marker — the token no longer resolves.
  const atPrefix = props.editor.isEditable ? "@" : "";
  const display = dead ? `@${slug}` : `${atPrefix}${title}`;
  return (
    <NodeViewWrapper
      as="span"
      data-type="mention"
      data-id={slug}
      className={dead ? "mention dead-link" : "mention"}
    >
      {display}
    </NodeViewWrapper>
  );
}

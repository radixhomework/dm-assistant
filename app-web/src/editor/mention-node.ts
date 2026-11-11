import Mention from "@tiptap/extension-mention";
import type { MarkdownToken } from "@tiptap/core";

/**
 * `@slug` mention node (PRE-SPEC.md §6). The official Mention extension
 * provides the suggestion popup (keyboard navigation, char "@"); the
 * markdown hooks make stored bodies round-trip byte-for-byte: the token
 * consumes exactly the slug charset and serializes back to "@slug".
 *
 * The mention's slug is stored in the official `id` attribute (id = slug);
 * no attribute override — TipTap v3's parent chain on addAttributes is
 * not extensible this way.
 *
 * Word-start rule: the tokenizer's start() only reports "@" preceded by
 * start-of-chunk or a non-slug character, so email addresses
 * (user@example.com) never tokenize as mentions.
 */
export const RecordMention = Mention.extend({
  markdownTokenName: "mention",

  markdownTokenizer: {
    name: "mention",
    level: "inline",
    start(src: string): number {
      // Word-start rule: "@" after chunk start or a non-slug character,
      // followed by at least one slug character. -1 means no candidate.
      const re = /(?:^|[^a-z0-9-])@(?=[a-z0-9-])/g;
      const match = re.exec(src);
      return match === null ? -1 : match.index + (match[0].length - 1);
    },
    tokenize(src: string): MarkdownToken | undefined {
      if (!src.startsWith("@")) return undefined;
      const match = /^@([a-z0-9-]+)/.exec(src);
      if (!match) return undefined;
      return {
        type: "mention",
        raw: match[0],
        text: match[0],
        slug: match[1],
      };
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.createNode("mention", { id: token.slug, label: token.slug });
  },

  renderMarkdown(node) {
    return `@${node.attrs?.id ?? ""}`;
  },
});

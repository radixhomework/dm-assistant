import { Mark, mergeAttributes } from "@tiptap/core";
import type { MarkdownToken } from "@tiptap/core";

/**
 * Editorial intent marks (DM request): `==...==` flags a passage to
 * paraphrase, `++...++` a passage to develop. They are persistent
 * workflow markers on imported SRD text — visible in both modes — with
 * distinct styles so the DM spots unfinished work at a glance.
 */

function intentMark(name: "paraphrase" | "develop", wrapper: string, open: RegExp) {
  return Mark.create({
    name,
    inclusive: false,

    parseHTML() {
      return [{ tag: `mark[data-intent="${name}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "mark",
        mergeAttributes({ "data-intent": name, class: `mark-${name}` }, HTMLAttributes),
        0,
      ];
    },

    markdownTokenName: name,

    markdownTokenizer: {
      name,
      level: "inline",
      start(src: string): number {
        const index = src.indexOf(wrapper);
        return index === -1 ? -1 : index;
      },
      tokenize(src: string): MarkdownToken | undefined {
        const match = open.exec(src);
        if (!match) return undefined;
        return {
          type: name,
          raw: match[0],
          text: match[1],
          tokens: [],
        };
      },
    },

    parseMarkdown(token) {
      // The markdown engine expects the mark's NAME; it applies it to the
      // parsed inline content itself.
      return { mark: name, content: [{ type: "text", text: token.text }] };
    },

    renderMarkdown(mark): string {
      return `${wrapper}${mark.content?.[0]?.text ?? ""}${wrapper}`;
    },
  });
}

export const ParaphraseMark = intentMark("paraphrase", "==", /^==([^=]+)==/);
export const DevelopMark = intentMark("develop", "++", /^\+\+([^+]+)\+\+/);

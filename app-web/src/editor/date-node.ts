import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { MarkdownToken } from "@tiptap/core";
import { DateView } from "./date-view.js";

/**
 * Inline calendar date node (records-editor decision 7): an atom storing
 * {year, month?, day?} — signed years, no year 0. Canonical inline
 * markdown form `[[date:Y-M-D]]` (month and day optional), round-tripping
 * byte-for-byte through the round-trip harness. The React node view
 * renders the localized form via the world calendar definition (month
 * names) when one exists, the canonical form otherwise.
 */
export const CalendarDateNode = Node.create({
  name: "calendarDate",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      year: { default: null },
      month: { default: null },
      day: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="calendar-date"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-type": "calendar-date",
          "data-year": node.attrs.year,
          "data-month": node.attrs.month,
          "data-day": node.attrs.day,
          class: "date-node",
        },
        HTMLAttributes,
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateView);
  },

  markdownTokenName: "date",

  markdownTokenizer: {
    name: "date",
    level: "inline",
    start(src: string): number {
      const index = src.indexOf("[[date:");
      return index === -1 ? -1 : index;
    },
    tokenize(src: string): MarkdownToken | undefined {
      const match = /^\[\[date:(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?\]\]/.exec(src);
      if (!match) return undefined;
      return {
        type: "date",
        raw: match[0],
        text: match[0],
        year: Number(match[1]),
        month: match[2] === undefined ? undefined : Number(match[2]),
        day: match[3] === undefined ? undefined : Number(match[3]),
      };
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.createNode("calendarDate", {
      year: token.year,
      month: token.month ?? null,
      day: token.day ?? null,
    });
  },

  renderMarkdown(node): string {
    const year = node.attrs?.year as number | null;
    const month = node.attrs?.month as number | null;
    const day = node.attrs?.day as number | null;
    if (year === null || year === undefined) return "";
    // Canonical form zero-pads month and day to two digits.
    let form = `[[date:${year}`;
    if (month !== null && month !== undefined) form += `-${String(month).padStart(2, "0")}`;
    if (day !== null && day !== undefined) form += `-${String(day).padStart(2, "0")}`;
    return `${form}]]`;
  },
});

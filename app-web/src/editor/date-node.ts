import { InputRule, Node, mergeAttributes } from "@tiptap/core";
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

  // Keyboard shortcut: typing `/year-month-day` followed by a space
  // inserts the date node (the trailing space terminates the pattern so
  // it never fires mid-typing, and is kept after the node). The year
  // needs at least two digits so fractions like "1/2" never trigger.
  // Invalid values (month > 12, day > 31, year 0) stay as plain text.
  addInputRules() {
    return [
      new InputRule({
        find: /\/(-?\d{2,6})-(\d{1,2})-(\d{1,2})(\s)$/,
        handler: ({ range, match, commands }) => {
          const year = Number(match[1]);
          const month = Number(match[2]);
          const day = Number(match[3]);
          if (
            year === 0 ||
            month < 1 ||
            month > 12 ||
            day < 1 ||
            day > 31
          ) {
            return;
          }
          commands.insertContentAt(
            { from: range.from, to: range.to },
            [
              {
                type: this.name,
                attrs: { year, month, day },
              },
              { type: "text", text: match[4] },
            ],
          );
        },
      }),
    ];
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

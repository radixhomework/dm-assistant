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

  // Keyboard shortcut: typing `/year[-month[-day]]` followed by a space
  // inserts the date node — partial dates are allowed (year only, or
  // year and month), mirroring the canonical `[[date:Y-M-D]]` form. The
  // trailing space terminates the pattern so it never fires mid-typing
  // and is kept after the node. A digit right before the slash (as in
  // the fractions "1/2" or "10/12") blocks the rule; invalid values
  // (month > 12, day > 31, year 0) stay as plain text. The handler
  // mutates state.tr — the machinery dispatches it once the typed text
  // is part of the transaction (dispatching through commands would race
  // the not-yet-applied typed text).
  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\d)\/(-?\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?\s$/,
        handler: ({ state, range, match }) => {
          const year = Number(match[1]);
          const month = match[2] !== undefined ? Number(match[2]) : null;
          const day = match[3] !== undefined ? Number(match[3]) : null;
          const monthOk = month === null || (month >= 1 && month <= 12);
          const dayOk = day === null || (day >= 1 && day <= 31);
          if (year === 0 || !monthOk || !dayOk) {
            return;
          }
          const { tr } = state;
          const node = state.schema.nodes.calendarDate.create({
            year,
            month,
            day,
          });
          const space = state.schema.text(" ");
          tr.replaceWith(range.from, range.to, [node, space]);
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

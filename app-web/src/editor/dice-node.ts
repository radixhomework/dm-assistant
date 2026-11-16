import { InputRule, Node, mergeAttributes } from "@tiptap/core";
import type { MarkdownToken } from "@tiptap/core";
import { diceAverage, parseDice } from "./dice.js";

/**
 * Inline dice node (DM request): stores a dice formula
 * ("3d6+2", "2d8", "1d20-1") in the canonical markdown `[[dice:...]]`
 * and renders the formula with its round-down average — "3d6 + 2 (12)"
 * — the stat-block convention. The average is pure math on the DM's
 * formula; the application never invents one.
 */
export const DiceNode = Node.create({
  name: "dice",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      formula: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="dice"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const formula = node.attrs.formula as string | null;
    const average = formula === null ? null : diceAverage(formula);
    let text = "";
    if (formula !== null && formula !== undefined) {
      text = average === null ? formula : `${formula} (${average})`;
    }
    return [
      "span",
      mergeAttributes(
        { "data-type": "dice", "data-formula": formula, class: "dice-node" },
        HTMLAttributes,
      ),
      text,
    ];
  },

  markdownTokenName: "dice",

  markdownTokenizer: {
    name: "dice",
    level: "inline",
    start(src: string): number {
      const index = src.indexOf("[[dice:");
      return index === -1 ? -1 : index;
    },
    tokenize(src: string): MarkdownToken | undefined {
      const match = /^\[\[dice:([+-]?\d{1,3}d\d{1,3}(?:[+-]\d{1,3})?)\]\]/.exec(src);
      if (!match) return undefined;
      return {
        type: "dice",
        raw: match[0],
        text: match[1],
      };
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.createNode("dice", { formula: token.text });
  },

  renderMarkdown(node): string {
    const formula = node.attrs?.formula as string | null;
    return formula === null || formula === undefined ? "" : `[[dice:${formula}]]`;
  },

  // Keyboard shortcut: typing `&formula` followed by a space inserts the
  // dice node — "1d10+4", "2d8", "d20" — mirroring the canonical
  // `[[dice:...]]` form. The trailing space terminates the pattern so it
  // never fires mid-typing and is kept after the node. A word character
  // right before the ampersand blocks the rule, and an invalid formula
  // (count or faces 0) stays as plain text. The handler mutates state.tr
  // — the machinery dispatches it once the typed text is part of the
  // transaction.
  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\w)&([+-]?\d{1,3})?d(\d{1,3})([+-]\d{1,3})?\s$/,
        handler: ({ state, range, match }) => {
          const formula = `${match[1] ?? ""}d${match[2]}${match[3] ?? ""}`;
          if (parseDice(formula) === null) {
            return;
          }
          const { tr } = state;
          const node = state.schema.nodes.dice.create({ formula });
          const space = state.schema.text(" ");
          tr.replaceWith(range.from, range.to, [node, space]);
        },
      }),
    ];
  },
});
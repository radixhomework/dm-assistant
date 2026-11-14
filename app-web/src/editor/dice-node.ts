import { Node, mergeAttributes } from "@tiptap/core";
import type { MarkdownToken } from "@tiptap/core";
import { diceAverage } from "./dice.js";

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
    const text =
      formula === null || formula === undefined
        ? ""
        : average === null
          ? formula
          : `${formula} (${average})`;
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
});

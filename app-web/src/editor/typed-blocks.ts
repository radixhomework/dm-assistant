import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Typed-block factory for the Scene running-notes pattern (PRE-SPEC.md §6):
 * provisional `:::name` fenced containers, generalizing the spike's probe.
 * Each block round-trips byte-for-byte through the round-trip harness.
 *
 * Scope note: typed blocks are a visual distinction at render time — the
 * product is DM-only, so there is no access model behind them.
 */

export type TypedBlockName = "attention" | "mechanics";

export function createTypedBlock(name: TypedBlockName): Node {
  const token = name;
  const attr = `data-typed-block`;

  return Node.create({
    name,
    group: "block",
    content: "block+",

    parseHTML() {
      return [{ tag: `div[${attr}="${name}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes({ [attr]: name, class: `typed-block typed-block-${name}` }, HTMLAttributes),
        0,
      ];
    },

    markdownTokenName: token,

    markdownTokenizer: {
      name: token,
      level: "block",
      start: `:::${name}`,
      tokenize(src, _tokens, lexer) {
        const open = new RegExp(`^:::${name}[ \\t]*\\n([\\s\\S]*?)\\n:::[ \\t]*(?:\\n|$)`).exec(src);
        if (!open) return undefined;
        return {
          type: token,
          raw: open[0],
          text: open[1],
          tokens: lexer.blockTokens(open[1]),
        };
      },
    },

    parseMarkdown(token, helpers) {
      return helpers.createNode(name, undefined, helpers.parseChildren(token.tokens ?? []));
    },

    renderMarkdown(node, helpers) {
      const inner = helpers.renderChildren(node.content ?? [], "\n\n");
      return `:::${name}\n${inner}\n:::`;
    },
  });
}

export const AttentionPoint = createTypedBlock("attention");
export const Mechanics = createTypedBlock("mechanics");

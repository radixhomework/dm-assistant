import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Custom-node probe (design decision 8): a minimal typed block representative
 * of the Scene running-notes pattern. The syntax below is provisional — the
 * definitive typed-block syntax is a records-editor decision; this node only
 * proves that the official markdown extension can round-trip a custom node.
 *
 * Provisional syntax: a `:::attention` fenced container.
 */
export const AttentionPoint = Node.create({
  name: "attentionPoint",
  group: "block",
  content: "block+",

  parseHTML() {
    return [{ tag: "div[data-attention]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-attention": "" }, HTMLAttributes), 0];
  },

  markdownTokenName: "attention",

  markdownTokenizer: {
    name: "attention",
    level: "block",
    start: ":::attention",
    tokenize(src, _tokens, lexer) {
      const match = /^:::attention[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n|$)/.exec(src);
      if (!match) return undefined;
      return {
        type: "attention",
        raw: match[0],
        text: match[1],
        tokens: lexer.blockTokens(match[1]),
      };
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.createNode("attentionPoint", undefined, helpers.parseChildren(token.tokens ?? []));
  },

  renderMarkdown(node, helpers) {
    const inner = helpers.renderChildren(node.content ?? [], "\n\n");
    return `:::attention\n${inner}\n:::`;
  },
});

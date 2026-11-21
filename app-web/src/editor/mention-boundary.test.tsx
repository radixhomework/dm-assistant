import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { buildExtensions } from "./extensions.js";

/** Parses markdown through the full extension set and returns the node
 * types of the first paragraph. */
function parse(md: string): Array<string | undefined> {
  const editor = new Editor({ extensions: buildExtensions() });
  editor.commands.setContent(md, { contentType: "markdown" });
  const types = (editor.getJSON().content?.[0]?.content ?? []).map(
    (node) => node.type,
  );
  editor.destroy();
  return types;
}

describe("the mention word-start rule", () => {
  it("keeps a trigger inside a word as plain text", () => {
    // "1" is consumed as text by marked one character at a time: the
    // tokenizer must reject the mention it would otherwise see at the
    // head of the remaining source.
    expect(parse("1@choice")).not.toContain("mention");
    expect(parse("10@choice")).not.toContain("mention");
  });

  it("still tokenizes a mention after a word boundary", () => {
    expect(parse("see @choice today")).toContain("mention");
    expect(parse("@choice opens the list")).toContain("mention");
  });
});

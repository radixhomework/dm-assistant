import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { buildExtensions } from "./extensions.js";

/** The shape of an editor JSON node we assert on. */
type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown> | undefined;
  text?: string | undefined;
  content?: JsonNode[] | undefined;
};

/**
 * The `&formula + space` rule fires through the view's handleTextInput.
 * The document must NOT already contain the trailing space (the HTML
 * parser drops it): the machinery rebuilds the text before the cursor
 * and appends the typed character itself.
 */
function typeTrailingSpace(editor: Editor): void {
  const doc = editor.state.doc;
  const end = doc.content.size - 1;
  editor.view.someProp("handleTextInput", (handler) =>
    handler(editor.view, end, end, " ", () => editor.view.state.tr),
  );
}

function editorWith(text: string): Editor {
  const editor = new Editor({ extensions: buildExtensions() });
  editor.commands.setContent(`<p>${text}</p>`);
  return editor;
}

function childrenOf(editor: Editor): JsonNode[] {
  return (editor.getJSON().content?.[0]?.content ?? []) as JsonNode[];
}

describe("the &dice input rule", () => {
  it("accepts count, bare die and modifier forms", () => {
    const cases = [
      { text: "&1d10+4", formula: "1d10+4" },
      { text: "&3d6+2", formula: "3d6+2" },
      { text: "&2d8", formula: "2d8" },
      { text: "&d20", formula: "d20" },
      { text: "&1d20-1", formula: "1d20-1" },
    ];
    for (const c of cases) {
      const editor = editorWith(c.text);
      typeTrailingSpace(editor);
      const [node, tail] = childrenOf(editor);
      expect(node?.type, c.text).toBe("dice");
      expect(node?.attrs, c.text).toMatchObject({ formula: c.formula });
      // The terminating space is kept after the node.
      expect(tail?.text, c.text).toBe(" ");
      editor.destroy();
    }
  });

  it("keeps invalid formulas and plain ampersands as typed text", () => {
    // Count 0 and faces 0 do not parse; a bare "&" with no formula is
    // just text.
    for (const text of ["&0d6", "&1d0", "&"] ) {
      const editor = editorWith(text);
      typeTrailingSpace(editor);
      const [node] = childrenOf(editor);
      expect(node?.type, text).toBe("text");
      editor.destroy();
    }
  });

  it("does not fire when the ampersand follows a word character", () => {
    // "AB&1d10" — the & sits inside a word, no insertion.
    const editor = editorWith("AB&1d10");
    typeTrailingSpace(editor);
    const [node] = childrenOf(editor);
    expect(node?.type).toBe("text");
    editor.destroy();
  });
});

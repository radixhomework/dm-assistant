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
 * The `/year[-month[-day]] + space` rule fires through the view's
 * handleTextInput. The document must NOT already contain the trailing
 * space (the HTML parser drops it): the machinery rebuilds the text
 * before the cursor and appends the typed character itself.
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

describe("the /date input rule", () => {
  it("accepts the full, partial and guarded forms", () => {
    const cases = [
      { text: "/842-3-12", type: "calendarDate", attrs: { year: 842, month: 3, day: 12 } },
      { text: "/842", type: "calendarDate", attrs: { year: 842, month: null, day: null } },
      { text: "/-1200-7", type: "calendarDate", attrs: { year: -1200, month: 7, day: null } },
      { text: "/-120-7-5", type: "calendarDate", attrs: { year: -120, month: 7, day: 5 } },
      { text: "/1", type: "calendarDate", attrs: { year: 1, month: null, day: null } },
    ];
    for (const c of cases) {
      const editor = editorWith(c.text);
      typeTrailingSpace(editor);
      const [node, tail] = childrenOf(editor);
      expect(node?.type, c.text).toBe("calendarDate");
      expect(node?.attrs, c.text).toMatchObject(c.attrs);
      expect(tail?.text, c.text).toBe(" ");
      editor.destroy();
    }
  });

  it("keeps invalid dates and fractions as typed text", () => {
    for (const text of ["/842-13-40", "/0-3-12", "1/2", "10/12", "895/925"]) {
      const editor = editorWith(text);
      typeTrailingSpace(editor);
      const [node] = childrenOf(editor);
      expect(node?.type, text).toBe("text");
      editor.destroy();
    }
  });
});

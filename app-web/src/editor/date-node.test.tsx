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
 * The `/year-month-day + space` rule fires through the view's
 * handleTextInput. The document must NOT already contain the trailing
 * space (the HtmlParser drops it): the machinery rebuilds the text
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

describe("the /year-month-day date input rule", () => {
  it("inserts a date node when typing /842-3-12 plus a space", () => {
    const editor = editorWith("/842-3-12");
    typeTrailingSpace(editor);
    const paragraph = editor.getJSON().content?.[0];
    const [node, tail] = (paragraph?.content ?? []) as JsonNode[];
    expect(node?.type).toBe("calendarDate");
    expect(node?.attrs).toMatchObject({ year: 842, month: 3, day: 12 });
    // The terminating space is kept after the node.
    expect(tail?.type).toBe("text");
    expect(tail?.text).toBe(" ");
    editor.destroy();
  });

  it("accepts negative years", () => {
    const editor = editorWith("/-120-7-5");
    typeTrailingSpace(editor);
    const [node] = (editor.getJSON().content?.[0]?.content ?? []) as JsonNode[];
    expect(node?.type).toBe("calendarDate");
    expect(node?.attrs).toMatchObject({ year: -120, month: 7, day: 5 });
    editor.destroy();
  });

  it("keeps invalid dates as typed text", () => {
    // Month 13 and year 0 are both outside the calendar.
    for (const text of ["/842-13-40", "/0-3-12"]) {
      const editor = editorWith(text);
      typeTrailingSpace(editor);
      const [node] = (editor.getJSON().content?.[0]?.content ?? []) as JsonNode[];
      expect(node?.type).toBe("text");
      editor.destroy();
    }
  });
});

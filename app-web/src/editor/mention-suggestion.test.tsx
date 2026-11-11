import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { buildExtensions } from "./extensions.js";
import { mentionSuggestion } from "./mention-suggestion.js";

vi.mock("@tiptap/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/react")>();
  class FakeRenderer {
    element: HTMLElement = document.createElement("div");
    ref: { onKeyDown?: (event: KeyboardEvent) => boolean } | null = null;
    updateProps: (next: { props: { clientRect?: () => DOMRect | null } }) => void = () => undefined;
    constructor(_component: unknown, props: { props: { clientRect?: () => DOMRect | null } }) {
      this.element.className = "mention-list";
      this.element.style.position = "fixed";
      document.body.appendChild(this.element);
      this.position(props.props.clientRect?.());
    }
    position(rect?: DOMRect | null) {
      if (rect) this.element.style.top = `${rect.bottom + 4}px`;
    }
    destroy() {
      this.element.remove();
    }
  }
  return { ...actual, ReactRenderer: FakeRenderer as unknown as typeof actual.ReactRenderer };
});


function fakeEditor() {
  const insertContentAt = vi.fn(() => ({ run: () => undefined }));
  const focus = vi.fn(() => ({ insertContentAt }));
  return { editor: { chain: () => ({ focus }) } as unknown as Editor, insertContentAt };
}

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mentionSuggestion", () => {
  it("queries the autocomplete endpoint and maps candidates", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse([
      { slug: "osgwirond", title: "Osgwirond", type: "places" },
    ])));
    const items = await mentionSuggestion.items!({ query: "osg", editor: headlessEditor(), signal: null as never });
    expect(items).toEqual([{ slug: "osgwirond", title: "Osgwirond", type: "places" }]);
  });

  it("inserts the mention node at the suggestion range", () => {
    const { editor, insertContentAt } = fakeEditor();
    mentionSuggestion.command!({
      editor,
      range: { from: 5, to: 9 },
      props: { slug: "osgwirond", title: "Osgwirond", type: "places" },
      clientRect: null,
    } as never);
    expect(insertContentAt).toHaveBeenCalledWith(
      { from: 5, to: 9 },
      [
        { type: "mention", attrs: { id: "osgwirond", label: "Osgwirond" } },
        { type: "text", text: " " },
      ],
    );
  });

  function headlessEditor(): Editor {
    return new Editor({ extensions: buildExtensions() });
  }

  it("reports Escape as handled and closes the popup", () => {
    document.body.innerHTML = "";
    const lifecycle = mentionSuggestion.render!();
    lifecycle.onBeforeStart!({ clientRect: () => new DOMRect(0, 0, 0, 0), editor: headlessEditor, items: [], command: vi.fn(), decorationNode: null, range: null, query: "", text: "", loading: false } as never);
    const handled = lifecycle.onKeyDown!({ event: new KeyboardEvent("keydown", { key: "Escape" }) } as never);
    expect(handled).toBe(true);
    expect(document.querySelector(".mention-list")).toBeNull();
  });
});

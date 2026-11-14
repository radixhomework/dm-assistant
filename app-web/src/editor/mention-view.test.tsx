import { describe, expect, it, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import type { NodeViewProps } from "@tiptap/react";
import { MentionView } from "./mention-view.js";
import { renderWithProviders } from "../testing/render.js";

function nodeViewProps(slug: string, label: string | null, isEditable: boolean): NodeViewProps {
  return {
    node: { attrs: { id: slug, label } },
    editor: { isEditable },
    selected: false,
    extension: {},
    decorations: [],
    updateAttributes: vi.fn(),
    deleteNode: vi.fn(),
  } as unknown as NodeViewProps;
}

describe("MentionView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the label with @ in edit mode, then resolves the title", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ slug: "osgwirond", title: "Osgwirond" }),
    })));
    renderWithProviders(<MentionView {...nodeViewProps("osgwirond", "osgwirond", true)} />);
    expect(screen.getByText("@osgwirond")).toBeDefined();
    await vi.waitFor(() => expect(screen.getByText("@Osgwirond")).toBeDefined());
    const span = screen.getByText("@Osgwirond");
    expect(span.getAttribute("data-id")).toBe("osgwirond");
    expect(span.getAttribute("data-type")).toBe("mention");
  });

  it("drops the @ prefix in reading mode", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ slug: "osgwirond", title: "Osgwirond" }),
    })));
    renderWithProviders(<MentionView {...nodeViewProps("osgwirond", null, false)} />);
    await vi.waitFor(() => expect(screen.getByText("Osgwirond")).toBeDefined());
  });

  it("marks a dead target with the slug and the dead-link style", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: "not found" }),
    })));
    renderWithProviders(<MentionView {...nodeViewProps("vanished", null, false)} />);
    await vi.waitFor(() => {
      const dead = document.querySelector(".mention.dead-link");
      expect(dead).not.toBeNull();
      expect(dead?.textContent).toBe("@vanished");
    });
  });
});

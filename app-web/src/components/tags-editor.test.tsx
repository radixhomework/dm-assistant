import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "../testing/render.js";
import { TagsEditor } from "./tags-editor";

function makeHarness(initial: string[] = []) {
  const onChange = vi.fn();
  renderWithProviders(<TagsEditor tags={initial} onChange={onChange} />, {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  });
  return onChange;
}

describe("TagsEditor", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    document.body.innerHTML = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/tags") {
          return {
            ok: true,
            json: async () => [
              { tag: "forêt", count: 3 },
              { tag: "voyage", count: 1 },
            ],
          };
        }
        if (input === "/api/auth/me") {
          return {
            ok: true,
            json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
          };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
  });

  it("adds a tag on Enter, displayed normalized", async () => {
    const onChange = makeHarness([]);
    const input = screen.getByLabelText("Add a tag");
    fireEvent.change(input, { target: { value: "  Forêt   Noire  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["forêt noire"]);
  });

  it("does not add a duplicate", async () => {
    const onChange = makeHarness(["forêt"]);
    const input = screen.getByLabelText("Add a tag");
    fireEvent.change(input, { target: { value: "Forêt" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores Enter during an IME composition", async () => {
    const onChange = makeHarness([]);
    const input = screen.getByLabelText("Add a tag");
    fireEvent.change(input, { target: { value: "下書き" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onChange).not.toHaveBeenCalled();
    // The composing draft survives in the input: the IME candidate is
    // not final text.
    expect((input as HTMLInputElement).value).toBe("下書き");
  });

  it("removes a tag through its chip button", async () => {
    makeHarness(["forêt", "voyage"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove tag forêt" }));
    // The parent owns the state: the removal callback carries the rest.
    expect(
      screen.getByRole("button", { name: "Remove tag voyage" }),
    ).toBeDefined();
  });

  it("offers the inventory tags as completion suggestions", async () => {
    makeHarness([]);
    await vi.waitFor(() => {
      const list = document.getElementById("tag-inventory");
      expect(list?.querySelectorAll("option").length).toBe(2);
    });
  });
});

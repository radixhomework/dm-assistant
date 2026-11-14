import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ProseEditor } from "./prose-editor.js";
import { renderWithProviders } from "../testing/render.js";

describe("ProseEditor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.lang = "en";
  });

  it("renders the two toolbar rows in edit mode", () => {
    renderWithProviders(<ProseEditor markdown="" onChange={() => undefined} />);
    const toolbar = screen.getByRole("toolbar", { name: "Formatting toolbar" });
    expect(toolbar.querySelectorAll("button").length).toBeGreaterThan(5);
    expect(screen.getByRole("toolbar", { name: "Highlight blocks" })).toBeDefined();
  });

  it("hides the toolbars in readonly mode", () => {
    renderWithProviders(<ProseEditor markdown="" readonly />);
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(document.querySelector(".ProseMirror")).not.toBeNull();
  });

  it("emits markdown on input through onChange", async () => {
    const onChange = vi.fn();
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    await vi.waitFor(() => expect(document.querySelector(".ProseMirror")).not.toBeNull());
    const pm = document.querySelector(".ProseMirror");
    pm!.dispatchEvent(new Event("click", { bubbles: true }));
    ((pm as unknown as { editor: { commands: { insertContent: (c: string) => void } } }).editor.commands.insertContent("hello world"));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    const markdown = onChange.mock.calls.at(-1)![0] as string;
    expect(markdown).toContain("hello world");
  });

  it("opens the referenced record in a new tab when a mention is clicked in readonly mode", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderWithProviders(<ProseEditor markdown="" readonly />);
    const pm = document.querySelector(".ProseMirror")!;
    const span = document.createElement("span");
    span.setAttribute("data-type", "mention");
    span.setAttribute("data-id", "osgwirond");
    pm.appendChild(span);
    span.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(openSpy).toHaveBeenCalledWith("/records/osgwirond", "_blank", "noopener");
    openSpy.mockRestore();
  });
});

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ProseEditor } from "./prose-editor.js";
import { renderWithProviders } from "../testing/render.js";

describe("ProseEditor toolbar", () => {
  it("toggles bold and emits the markdown through onChange", () => {
    const onChange = vi.fn();
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    const toolbar = screen.getByRole("toolbar", { name: "Formatting toolbar" });
    const bold = [...toolbar.querySelectorAll("button")].find((b) => b.textContent === "B")!;
    bold.click();
    const pm = document.querySelector(".ProseMirror") as HTMLElement & {
      editor: { commands: { insertContent: (c: string) => void } };
    };
    pm.editor.commands.insertContent("strong words");
    expect(onChange.mock.calls.at(-1)![0] as string).toContain("**strong words**");
  });

  it("sets a link through the prompt", () => {
    const onChange = vi.fn();
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    const pm = document.querySelector(".ProseMirror") as HTMLElement & {
      editor: { commands: { insertContent: (c: string) => void; selectAll?: () => void; setTextSelection?: (r: { from: number; to: number }) => void; state: { doc: { content: { size: number } } } } };
    };
    pm.editor.commands.insertContent("a linked word");
    pm.editor.commands.selectAll?.();
    vi.spyOn(window, "prompt").mockReturnValue("https://example.com");
    const toolbar = screen.getByRole("toolbar", { name: "Formatting toolbar" });
    const link = [...toolbar.querySelectorAll("button")].find((b) => b.title === "Link")!;
    link.click();
    expect(onChange.mock.calls.at(-1)![0] as string).toContain("https://example.com");
  });
});

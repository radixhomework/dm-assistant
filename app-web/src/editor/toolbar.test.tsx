import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
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
    // An empty prompt removes the link instead of setting an empty href.
    const emptyPrompt = vi.spyOn(window, "prompt").mockReturnValue("");
    link.click();
    const markdown = onChange.mock.calls.at(-1)![0] as string;
    expect(markdown).not.toContain("https://example.com");
    emptyPrompt.mockRestore();
  });

  it("inserts an image through the prompt", () => {
    const onChange = vi.fn();
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    vi.spyOn(window, "prompt").mockReturnValue("/assets/map.png");
    const toolbar = screen.getByRole("toolbar", { name: "Formatting toolbar" });
    const image = [...toolbar.querySelectorAll("button")].find((b) => b.title === "Image")!;
    image.click();
    const markdown = onChange.mock.calls.at(-1)![0] as string;
    expect(markdown).toContain("![](/assets/map.png)");
  });

  it("does not insert a dice node when the prompt is cancelled", () => {
    const onChange = vi.fn();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    const highlightToolbar = screen.getByRole("toolbar", { name: "Highlight blocks" });
    const dice = [...highlightToolbar.querySelectorAll("button")].find(
      (b) => (b.getAttribute("aria-label") ?? "").startsWith("Dice roll"),
    )!;
    dice.click();
    // No node, and the markdown stayed empty (ProseEditor emits an
    // initial "" through onChange on mount — only the node matters).
    expect(document.querySelector(".dice-node")).toBeNull();
    expect((onChange.mock.calls.at(-1)?.[0] as string) ?? "").toBe("");
    prompt.mockRestore();
  });

  it("inserts a date node through the calendar picker", async () => {
    // The world definition feeds the picker; the fallback covers the
    // generic months without one.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/settings/calendar") {
          return {
            ok: true,
            json: async () => ({
              months: [{ name: "M1", days: 30 }, { name: "M2", days: 31 }],
              week: { days: 8 },
              dayNames: ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"],
              moon: { name: "Lune", cycleDays: 29 },
              currentYear: 842,
            }),
          };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    const onChange = vi.fn();
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    const dateButton = [...document.querySelectorAll('button[title^="Date"]')][0] as HTMLButtonElement;
    if (!dateButton) throw new Error("date button missing");
    fireEvent.click(dateButton);
    await vi.waitFor(() =>
      expect(document.querySelectorAll('select[aria-label="Month"]').length).toBeGreaterThan(0),
    );
    // The year defaults to the world's current year (842), adopted once
    // the definition arrives.
    const yearInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    await vi.waitFor(() => expect(yearInput.value).toBe("842"));
    const monthSelect = document.querySelector('select[aria-label="Month"]') as HTMLSelectElement;
    const monthOption = [...monthSelect.options].find((o) => o.textContent === "M1")!;
    fireEvent.change(monthSelect, { target: { value: monthOption.value } });
    const daySelect = document.querySelector('select[aria-label="Day"]') as HTMLSelectElement;
    fireEvent.change(daySelect, { target: { value: "12" } });
    const insert = [...document.querySelectorAll("button")].find((b) => b.textContent === "Insert") as HTMLButtonElement;
    insert.click();
    await vi.waitFor(() => {
      expect(document.querySelector(".date-node")).not.toBeNull();
      expect(onChange.mock.calls.at(-1)![0] as string).toContain("[[date:842-01-12]]");
    });
    // The picker closed after inserting.
    expect(document.querySelectorAll('select[aria-label="Month"]')).toHaveLength(0);
  });

  it("inserts a dice node through the toolbar prompt", async () => {
    const onChange = vi.fn();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("2d6");
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    const diceButton = document.querySelector(
      'button[aria-label^="Dice roll"]',
    ) as HTMLButtonElement | null;
    if (!diceButton) throw new Error("dice button missing");
    fireEvent.click(diceButton);
    await vi.waitFor(() => {
      const dice = document.querySelector(".dice-node");
      expect(dice).not.toBeNull();
      expect(dice!.textContent).toBe("2d6 (7)");
    });
    const markdown = onChange.mock.calls.at(-1)![0] as string;
    expect(markdown).toContain("[[dice:2d6]]");
    prompt.mockRestore();
  });

  it("inserts a highlight block from its icon and keeps it out of typed blocks", () => {
    const onChange = vi.fn();
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    const highlightToolbar = screen.getByRole("toolbar", { name: "Highlight blocks" });
    const attention = [...highlightToolbar.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Attention point",
    );
    if (!attention) throw new Error("attention button missing");
    fireEvent.click(attention);
    expect(document.querySelector('[data-typed-block="attention"]')).not.toBeNull();
    // Clicking again, with the caret inside the block, lands the new
    // block AFTER the outermost container instead of nesting.
    const paragraph = document.querySelector('[data-typed-block="attention"] p');
    if (paragraph) paragraph.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fireEvent.click(attention);
    expect(document.querySelectorAll('[data-typed-block="attention"]')).toHaveLength(2);
    const markdown = onChange.mock.calls.at(-1)![0] as string;
    expect(markdown).toContain(":::attention");
  });

  it("keeps toolbars out of the Tab order", () => {
    renderWithProviders(<ProseEditor markdown="" onChange={vi.fn()} />);
    for (const toolbar of document.querySelectorAll('[role="toolbar"]')) {
      expect(toolbar.getAttribute("tabindex")).toBe("-1");
      for (const button of toolbar.querySelectorAll("button")) {
        expect(button.getAttribute("tabindex")).toBe("-1");
      }
    }
  });

  it("inserts a table with a header row from the toolbar", async () => {
    const onChange = vi.fn();
    renderWithProviders(<ProseEditor markdown="" onChange={onChange} />);
    const tableButton = document.querySelector(
      'button[aria-label="Table"]',
    ) as HTMLButtonElement | null;
    if (!tableButton) throw new Error("table button missing");
    fireEvent.click(tableButton);
    await vi.waitFor(() => {
      const table = document.querySelector(".ProseMirror table");
      expect(table).not.toBeNull();
      // A 3×3 grid whose first row is the header (rows includes it).
      expect(table!.querySelectorAll("tr")).toHaveLength(3);
      expect(table!.querySelectorAll("th")).toHaveLength(3);
    });
    // The markdown serialization emits GFM.
    const markdown = onChange.mock.calls.at(-1)![0] as string;
    expect(markdown).toContain("|");
  });
});

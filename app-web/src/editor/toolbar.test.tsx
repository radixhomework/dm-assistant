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
    const dateButton = [...document.querySelectorAll('button[title="Date"]')][0] as HTMLButtonElement;
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

  it("keeps toolbars out of the Tab order", () => {
    renderWithProviders(<ProseEditor markdown="" onChange={vi.fn()} />);
    for (const toolbar of document.querySelectorAll('[role="toolbar"]')) {
      expect(toolbar.getAttribute("tabindex")).toBe("-1");
      for (const button of toolbar.querySelectorAll("button")) {
        expect(button.getAttribute("tabindex")).toBe("-1");
      }
    }
  });
});

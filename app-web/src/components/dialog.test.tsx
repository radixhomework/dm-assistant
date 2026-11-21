import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dialog } from "./dialog.js";

describe("Dialog", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders as a modal dialog with the given title", () => {
    render(
      <Dialog title="New record" onClose={() => {}}>
        <form>
          <input aria-label="Title" />
        </form>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: "New record" })).toBeDefined();
  });

  it("moves focus to the first field on open and restores it on close", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    const { unmount } = render(
      <Dialog title="D" onClose={() => {}}>
        <form>
          <input aria-label="Title" />
        </form>
      </Dialog>,
    );
    // First focusable in the body — not the header close button.
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
    unmount();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("dismisses on Escape and on a backdrop click", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog title="D" onClose={onClose}>
        <form>
          <input aria-label="Title" />
        </form>
      </Dialog>,
    );
    const overlay = container.firstElementChild as HTMLElement;
    // Escape anywhere in the document dismisses.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // A click that targets the overlay itself (the backdrop) dismisses;
    // the dialog stays open for clicks that land inside the panel.
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
    (overlay.querySelector("[role=dialog]") as HTMLElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index.js";
import { ProseEditor } from "./prose-editor.js";
import { renderWithProviders } from "../testing/render.js";

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateSpy,
}));

describe("ProseEditor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.lang = "en";
    navigateSpy.mockClear();
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

  it("syncs the document when the markdown prop changes while mounted", async () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(
      <ProseEditor markdown="First prose." readonly onChange={onChange} />,
    );
    await vi.waitFor(() =>
      expect(document.querySelector(".ProseMirror")).not.toBeNull(),
    );
    expect(document.querySelector(".ProseMirror")!.textContent).toBe("First prose.");
    // A refetch supplies new prose: the mounted editor follows it.
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <I18nextProvider i18n={i18n}>
          <ProseEditor markdown="Second prose." readonly onChange={onChange} />
        </I18nextProvider>
      </QueryClientProvider>,
    );
    await vi.waitFor(() =>
      expect(document.querySelector(".ProseMirror")!.textContent).toBe("Second prose."),
    );
  });

  it("navigates to the referenced record when a mention is clicked in readonly mode", () => {
    renderWithProviders(<ProseEditor markdown="" readonly />);
    const pm = document.querySelector(".ProseMirror")!;
    const span = document.createElement("span");
    span.setAttribute("data-type", "mention");
    span.setAttribute("data-id", "osgwirond");
    pm.appendChild(span);
    span.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/records/$slug",
      params: { slug: "osgwirond" },
    });
  });
});

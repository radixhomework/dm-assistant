import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { TagsAdminTab } from "./tags-admin-tab.js";
import { renderWithProviders } from "../../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  Link: (props: { children?: React.ReactNode; to?: string }) => (
    <a href={props.to}>{props.children}</a>
  ),
  useNavigate: () => ({ to: vi.fn() }),
}));

describe("TagsAdminTab (record-tags capability)", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/tags") {
          return {
            ok: true,
            json: async () => [
              { tag: "forêt", count: 2 },
              { tag: "voyage", count: 1 },
            ],
          };
        }
        if (input === "/api/records") {
          return {
            ok: true,
            json: async () => [
              { id: "r1", slug: "greenwood", type: "places", title: "Greenwood", tags: ["forêt"], fields: {} },
              { id: "r2", slug: "trek", type: "events", title: "The Trek", tags: ["forêt", "voyage"], fields: {} },
            ],
          };
        }
        if (input === "/api/admin/tags/rename") {
          return { ok: true, json: async () => ({ renamed: 2 }) };
        }
        if (input === "/api/admin/tags/merge") {
          return { ok: true, json: async () => ({ merged: 2 }) };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
  });

  it("lists the inventory with per-tag counts and the records carrying it", async () => {
    renderWithProviders(<TagsAdminTab />);
    await vi.waitFor(() => expect(screen.getByText("forêt")).toBeDefined());
    expect(screen.getByText("Greenwood")).toBeDefined();
    // The Trek carries both tags: rendered under forêt and voyage.
    expect(screen.getAllByText("The Trek")).toHaveLength(2);
    // Record links open the record pages.
    const link = screen.getByText("Greenwood").closest("a");
    // The mocked Link renders the to-pattern; the params travel through
    // the real router in production.
    expect(link?.getAttribute("href")).toContain("/lore");
  });

  it("renames a tag and reports the touched records", async () => {
    const captured: Array<[string, RequestInit]> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        captured.push([input, init ?? {}]);
        if (input === "/api/tags") {
          return { ok: true, json: async () => [{ tag: "forêt", count: 2 }] };
        }
        if (input === "/api/records") return { ok: true, json: async () => [] };
        if (input === "/api/admin/tags/rename") {
          return { ok: true, json: async () => ({ renamed: 2 }) };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
    renderWithProviders(<TagsAdminTab />);
    await vi.waitFor(() => expect(screen.getByText("forêt")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("New name"), { target: { value: "forêt noire" } });
    // The inline form's submit shares the Rename label: pick the one
    // inside a form (document order interleaves the row buttons).
    const renameButtons = screen.getAllByRole("button", { name: "Rename" });
    const submit = renameButtons.find((b) => b.closest("form") !== null);
    expect(submit).toBeDefined();
    fireEvent.click(submit!);
    await vi.waitFor(() =>
      expect(screen.getByText(/2 record\(s\) updated/)).toBeDefined(),
    );
    const post = captured.find(
      ([path, init]) => path === "/api/admin/tags/rename" && init.method === "POST",
    );
    expect(JSON.parse(String(post?.[1].body))).toEqual({ from: "forêt", to: "forêt noire" });
  });

  it("merges a tag into another after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<TagsAdminTab />);
    await vi.waitFor(() => expect(screen.getByText("forêt")).toBeDefined());
    // Two rows carry a Merge button: open the inline form on the first.
    fireEvent.click(screen.getAllByRole("button", { name: "Merge" })[0]);
    fireEvent.change(screen.getByLabelText("Merge into"), { target: { value: "voyage" } });
    const mergeButtons = screen.getAllByRole("button", { name: "Merge" });
    const submit = mergeButtons.find((b) => b.closest("form") !== null);
    expect(submit).toBeDefined();
    fireEvent.click(submit!);
    await vi.waitFor(() =>
      expect(screen.getByText(/2 record\(s\) updated/)).toBeDefined(),
    );
    expect(confirmSpy).toHaveBeenCalled();
  });
});

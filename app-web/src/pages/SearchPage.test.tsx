import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../testing/render.js";
import { SearchPage } from "./SearchPage";

const h = vi.hoisted(() => ({
  search: {} as { q?: string; type?: string; tag?: string },
  navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => h.search,
  useNavigate: () => h.navigate,
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}));

function stubFetch(hits: unknown[]) {
  return vi.fn(async (input: string | RequestInfo) => {
    const path = String(input);
    if (path === "/api/auth/me") {
      return {
        ok: true,
        json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
      };
    }
    if (path === "/api/tags") {
      return {
        ok: true,
        json: async () => [{ tag: "voyage", count: 1 }],
      };
    }
    if (path.startsWith("/api/search?")) {
      return {
        ok: true,
        json: async () => hits,
      };
    }
    throw new Error("unexpected fetch: " + path);
  });
}

const hit = {
  id: "uuid-1",
  slug: "ecole-de-magie",
  title: "École de magie",
  type: "places",
  perimeter: "world",
  tags: ["voyage"],
  snippet: "une ⟦école⟧ réputée",
};

describe("SearchPage", () => {
  beforeEach(() => {
    h.search = {};
    h.navigate.mockClear();
    vi.stubGlobal("fetch", stubFetch([hit]));
  });

  it("renders results with highlighted snippets and category labels", async () => {
    h.search = { q: "ecole" };
    renderWithProviders(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText("École de magie")).toBeDefined();
    });
    expect(screen.getByText("école")).toBeDefined();
    // The category label renders both as the filter option and on the
    // result row.
    expect(screen.getAllByText("Places").length).toBeGreaterThan(0);
  });

  it("renders the no-results state", async () => {
    h.search = { q: "zorglub" };
    vi.stubGlobal("fetch", stubFetch([]));
    renderWithProviders(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/No record matches/)).toBeDefined();
    });
  });

  it("renders the failed-search state with a retry", async () => {
    h.search = { q: "ecole" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | RequestInfo) => {
        const path = String(input);
        if (path === "/api/auth/me") {
          return {
            ok: true,
            json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
          };
        }
        if (path === "/api/tags") {
          return { ok: true, json: async () => [] };
        }
        return { ok: false, status: 500, json: async () => ({ message: "boom" }) };
      }),
    );
    // No retry backoff: the error state must surface immediately.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderWithProviders(<SearchPage />, { client });
    await waitFor(() => {
      expect(screen.getByText("The search failed.")).toBeDefined();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("renders filters and updates the route through them", async () => {
    h.search = { q: "ecole" };
    renderWithProviders(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText("École de magie")).toBeDefined();
    });
    const typeFilter = screen.getByLabelText("Category");
    fireEvent.change(typeFilter, { target: { value: "places" } });
    const call = h.navigate.mock.calls.at(-1)![0] as {
      search: (previous: Record<string, unknown>) => Record<string, unknown>;
      replace: boolean;
    };
    // The search argument is an updater function over the route params.
    expect(call.replace).toBe(true);
    expect(call.search({})).toEqual(expect.objectContaining({ type: "places" }));
  });
});

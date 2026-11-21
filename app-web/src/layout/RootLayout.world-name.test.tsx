import { QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RootLayout } from "./RootLayout";
import { renderWithProviders } from "../testing/render.js";

// The rename flow (AdminPage settings save) invalidates ["bootstrap"]:
// RootLayout subscribes to that query, so the header and the tab title
// follow the new world name without a reload. This file isolates the
// subscription half of that flow.
// The mocked route path: the rename test stays on /admin, the record
// title test points it at a lore record URL.
const { routePath } = vi.hoisted(() => ({ routePath: { value: "/admin" } }));

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <p>page content</p>,
  useNavigate: () => vi.fn(),
  Link: (props: { children?: React.ReactNode; to?: string }) => (
    <a>{props.children}</a>
  ),
  useRouterState: (opts?: { select?: (s: unknown) => unknown }) =>
    opts?.select
      ? opts.select({ location: { pathname: routePath.value } })
      : { location: { pathname: routePath.value } },
}));

describe("RootLayout world name", () => {
  it("reflects a world rename in the header and tab title without a reload", async () => {
    let worldName = "Old";
    const client = new QueryClient();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input === "/api/bootstrap") {
          return { ok: true, json: async () => ({ adminExists: true, worldName }) };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<RootLayout />, { client });
    await vi.waitFor(() => expect(screen.getByText("Old")).toBeDefined());
    expect(document.title).toBe("Old");
    // The rename flow: settings save → invalidate → refetch → header.
    worldName = "New";
    await client.invalidateQueries({ queryKey: ["bootstrap"] });
    await vi.waitFor(() => expect(screen.getByText("New")).toBeDefined());
    expect(document.title).toBe("New");
  });
});

describe("RootLayout record routes", () => {
  it("leaves the tab title to record pages", async () => {
    routePath.value = "/lore/rec-1";
    let worldName = "World";
    const client = new QueryClient();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input === "/api/bootstrap") {
          return { ok: true, json: async () => ({ adminExists: true, worldName }) };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<RootLayout />, { client });
    await vi.waitFor(() => expect(screen.getByText("World")).toBeDefined());
    // The record page sets its own title once its data arrives (the
    // RecordPage effect; simulated here).
    document.title = "World - A record";
    // A layout re-render (world rename) must not stomp the record title.
    worldName = "World 2";
    await client.invalidateQueries({ queryKey: ["bootstrap"] });
    await vi.waitFor(() => expect(screen.getByText("World 2")).toBeDefined());
    expect(document.title).toBe("World - A record");
    routePath.value = "/admin";
  });
});

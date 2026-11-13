import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { RootLayout } from "./RootLayout";
import { renderWithProviders } from "../testing/render.js";
import { queryClient } from "../query-client.js";

// Mutable pathname the mocked router hook exposes; tests set it to
// simulate the current route.
const routerState: { pathname: string } = { pathname: "/" };

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Outlet: () => <p>page content</p>,
    useNavigate: () => vi.fn(),
    Link: (props: { children?: React.ReactNode; to?: string }) => (
      <a>{props.children}</a>
    ),
    useRouterState: (opts?: { select?: (s: unknown) => unknown }) =>
      opts?.select
        ? opts.select({ location: { pathname: routerState.pathname } })
        : { location: { pathname: routerState.pathname } },
  };
});

function mockSession(role: "admin" | "dm" | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/auth/me") {
        return {
          ok: true,
          json: async () =>
            role === null
              ? undefined
              : { id: "1", email: "a@b.c", displayName: "DM", role },
        };
      }
      if (input === "/api/records/war-of-embers") {
        return {
          ok: true,
          json: async () => ({
            slug: "war-of-embers",
            type: "campaign",
            perimeter: "campaign",
            title: "War of Embers",
            tags: [],
            fields: {},
            tracking: {
              slug: "war-of-embers",
              status: "not_played",
              children: [
                { slug: "chapter-one", title: "Chapter One", status: "not_played" },
              ],
            },
          }),
        };
      }
      if (input === "/api/records/chapter-one") {
        return {
          ok: true,
          json: async () => ({
            slug: "chapter-one",
            type: "chapter",
            perimeter: "campaign",
            title: "Chapter One",
            tags: [],
            fields: {},
            campaign: { slug: "war-of-embers", title: "War of Embers" },
          }),
        };
      }
      return { ok: true, status: 204, json: async () => ({}) };
    }),
  );
}

describe("RootLayout navigation", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    routerState.pathname = "/";
    queryClient.clear();
  });

  it("shows the three sections for an admin", async () => {
    mockSession("admin");
    renderWithProviders(<RootLayout />);
    expect(screen.getAllByText("Lore").length).toBeGreaterThan(0);
    expect(screen.getByText("Campaigns")).toBeDefined();
    await vi.waitFor(() => expect(screen.getByText("Admin")).toBeDefined());
    expect(screen.getByText("Log out")).toBeDefined();
    expect(screen.getByText("page content")).toBeDefined();
  });

  it("hides the Admin section for a dm", () => {
    mockSession("dm");
    renderWithProviders(<RootLayout />);
    expect(screen.getAllByText("Lore").length).toBeGreaterThan(0);
    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("renders the records sidebar with collapsed categories", async () => {
    mockSession("admin");
    renderWithProviders(<RootLayout />);
    await vi.waitFor(() =>
      expect(screen.getByRole("navigation", { name: "Records" })).toBeDefined(),
    );
    // Category headers exist and start collapsed (no record entries).
    expect(screen.getByRole("button", { name: /Places/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Monsters/ })).toBeDefined();
    expect(screen.queryByRole("link", { name: "City of Glass" })).toBeNull();
  });

  it("toggles the narrow-screen drawer with the header button", async () => {
    mockSession("admin");
    renderWithProviders(<RootLayout />);
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Records" })).toBeDefined(),
    );
    const toggle = screen.getByRole("button", { name: "Records" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    // The drawer shows its close button while open.
    expect(screen.getByRole("button", { name: "Close" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("hides the sidebar on Admin, Account and the campaign list", () => {
    mockSession("admin");
    for (const path of ["/admin", "/account", "/campaigns", "/calendar"]) {
      routerState.pathname = path;
      renderWithProviders(<RootLayout />);
      expect(screen.queryByRole("navigation", { name: "Records" })).toBeNull();
      // Remove the rendered tree before the next path renders.
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }
  });

  it("shows the campaign tree on a campaign view page", async () => {
    mockSession("admin");
    routerState.pathname = "/campaigns/war-of-embers";
    renderWithProviders(<RootLayout />);
    await vi.waitFor(() =>
      expect(screen.getByText("War of Embers")).toBeDefined(),
    );
    expect(screen.getByText("Chapter One")).toBeDefined();
  });

  it("shows the campaign tree on a chapter record page", async () => {
    mockSession("admin");
    queryClient.setQueryData(["record", "chapter-one"], {
      id: "2",
      slug: "chapter-one",
      type: "chapter",
      perimeter: "campaign",
      title: "Chapter One",
      tags: [],
      fields: {},
      campaign: { slug: "war-of-embers", title: "War of Embers" },
    });
    routerState.pathname = "/records/chapter-one";
    renderWithProviders(<RootLayout />);
    await vi.waitFor(() =>
      expect(screen.getByText("War of Embers")).toBeDefined(),
    );
    expect(screen.getByText("Chapter One")).toBeDefined();
  });
});

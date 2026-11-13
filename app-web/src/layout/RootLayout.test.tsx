import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { RootLayout } from "./RootLayout";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <p>page content</p>,
  useNavigate: () => vi.fn(),
  Link: (props: { children?: React.ReactNode; to?: string }) => (
    <a>{props.children}</a>
  ),
  useRouterState: (opts?: { select?: (s: unknown) => unknown }) =>
    opts?.select
      ? opts.select({ location: { pathname: "/" } })
      : { location: { pathname: "/" } },
}));

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
      return { ok: true, status: 204, json: async () => ({}) };
    }),
  );
}

describe("RootLayout navigation", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
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
});

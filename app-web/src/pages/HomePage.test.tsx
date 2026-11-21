import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { HomePage } from "./HomePage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { to?: string; children?: React.ReactNode }) => (
      <a data-to={props.to}>{props.children}</a>
    ),
  };
});

function stubSession(role: "admin" | "dm") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/auth/me") {
        return {
          ok: true,
          json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role }),
        };
      }
      return { ok: true, status: 204, json: async () => ({}) };
    }),
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
  });

  it("shows the four launcher tiles for a dm (no Admin)", async () => {
    stubSession("dm");
    renderWithProviders(<HomePage />);
    await vi.waitFor(() => expect(screen.getByText("Lore")).toBeDefined());
    expect(screen.getByText("Calendar")).toBeDefined();
    const loreTile = screen.getByText("Lore").closest("a");
    expect(loreTile?.getAttribute("data-to")).toBe("/lore");
    expect(screen.getByText("Campaigns")).toBeDefined();
    expect(screen.getByText("My account")).toBeDefined();
    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("shows the Admin tile for an admin", async () => {
    stubSession("admin");
    renderWithProviders(<HomePage />);
    await vi.waitFor(() => expect(screen.getByText("Admin")).toBeDefined());
    const adminTile = screen.getByText("Admin").closest("a");
    expect(adminTile?.getAttribute("data-to")).toBe("/admin");
  });

  it("describes each tile with its quick description", async () => {
    stubSession("admin");
    renderWithProviders(<HomePage />);
    await vi.waitFor(() =>
      expect(screen.getByText("World records, grouped by template type.")).toBeDefined(),
    );
    expect(screen.getByText("The world's year at a glance: events and moon cycle.")).toBeDefined();
    expect(screen.getByText("Instance users and settings.")).toBeDefined();
  });
});

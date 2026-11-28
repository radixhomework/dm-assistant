import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { AdminPage } from "./AdminPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  Link: (props: { children?: React.ReactNode; to?: string }) => (
    <a href={props.to}>{props.children}</a>
  ),
  useNavigate: () => ({ to: vi.fn() }),
}));

/** The fetch mock answers every surface the tabs touch, so each test
 * only clicks its tab and asserts the preserved content. */
function mockAdminApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/auth/me") {
        return {
          ok: true,
          json: async () => ({
            id: "1",
            email: "a@b.c",
            displayName: "DM",
            role: "admin",
          }),
        };
      }
      if (input === "/api/admin/users") {
        return {
          ok: true,
          json: async () => [
            { id: "u1", email: "a@b.c", displayName: "DM", role: "admin", status: "active" },
          ],
        };
      }
      if (input === "/api/tags") {
        return {
          ok: true,
          json: async () => [{ tag: "forêt", count: 2 }],
        };
      }
      if (input === "/api/records") {
        return {
          ok: true,
          json: async () => [
            { id: "r1", slug: "greenwood", type: "places", title: "Greenwood", tags: ["forêt"], fields: {} },
          ],
        };
      }
      if (input === "/api/sources") {
        return {
          ok: true,
          json: async () => [
            { id: "s0", name: "Internal", attribution: null, internal: true, disabled: false },
            { id: "s1", name: "Open5e (SRD 5.2)", attribution: null, internal: false, disabled: false },
          ],
        };
      }
      return {
        ok: true,
        json: async () => ({ worldName: "W", distanceUnit: "m", weightUnit: "kg", volumeUnit: "L" }),
      };
    }),
  );
}

describe("AdminPage tabs (accounts-and-admin spec)", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
  });

  it("shows the six tabs and opens each surface without leaving the route", async () => {
    mockAdminApi();
    renderWithProviders(<AdminPage />);
    await vi.waitFor(() =>
      expect(screen.getByRole("tab", { name: "Tags" })).toBeDefined(),
    );
    const tabNames = [
      "Users",
      "Instance",
      "Calendar",
      "Import catalogs",
      "External references",
      "Tags",
    ];
    for (const name of tabNames) {
      expect(screen.getByRole("tab", { name })).toBeDefined();
    }
    // Content preservation: the users list renders on the default tab
    // (the email is split across text nodes — assert the display name).
    await vi.waitFor(() => expect(screen.getByText("DM")).toBeDefined());
    // …the instance settings behind theirs…
    fireEvent.click(screen.getByRole("tab", { name: "Instance" }));
    await vi.waitFor(() => expect(screen.getByText("World name")).toBeDefined());
    // …the tags tab shows the inventory with its records…
    fireEvent.click(screen.getByRole("tab", { name: "Tags" }));
    await vi.waitFor(() => expect(screen.getByText("forêt")).toBeDefined());
    expect(screen.getByText("Greenwood")).toBeDefined();
    // …and the import tab opens its form.
    fireEvent.click(screen.getByRole("tab", { name: "Import catalogs" }));
    await vi.waitFor(() =>
      expect(screen.getByText("Target catalog")).toBeDefined(),
    );
  });

  it("denies a dm account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          id: "2",
          email: "dm@b.c",
          displayName: "DM",
          role: "dm",
        }),
      })),
    );
    renderWithProviders(<AdminPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("Admin")).toBeDefined(),
    );
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});

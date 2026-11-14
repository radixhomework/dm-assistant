import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { AppSidebar } from "./app-sidebar.js";
import { renderWithProviders } from "../testing/render.js";

// Mutable pathname the mocked router hooks expose; tests set it to
// simulate the current route (reading and editing views share the path).
const routerState: { pathname: string } = { pathname: "/" };

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: {
      params?: { slug?: string };
      className?: string;
      children?: React.ReactNode;
    }) => (
      <a className={props.className} href={`#${props.params?.slug ?? ""}`}>
        {props.children}
      </a>
    ),
    useRouterState: (opts?: { select?: (s: unknown) => unknown }) => {
      const state = { location: { pathname: routerState.pathname } };
      return opts?.select ? opts.select(state) : state;
    },
  };
});

type EntityLike = {
  slug: string;
  type: string;
  title: string;
};

const records: EntityLike[] = [
  { slug: "city-of-glass", type: "places", title: "City of Glass" },
  { slug: "silver-city", type: "places", title: "Silver City" },
  { slug: "the-undying", type: "monsters", title: "The Undying" },
];

function stubRecords(records: EntityLike[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/auth/me") {
        return {
          ok: true,
          json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
        };
      }
      console.log("FETCH", input);
      if (input === "/api/records?perimeter=world") {
        return { ok: true, json: async () => records };
      }
      return { ok: true, status: 204, json: async () => ({}) };
    }),
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    routerState.pathname = "/";
    stubRecords(records);
  });

  it("starts with every category collapsed", () => {
    renderWithProviders(<AppSidebar />);
    const places = screen.getByRole("button", { name: /Places/ });
    expect(places.getAttribute("aria-expanded")).toBe("false");
    // Collapsed: no record links anywhere.
    expect(screen.queryByText("City of Glass")).toBeNull();
    expect(screen.queryByText("The Undying")).toBeNull();
  });

  it("expands a category to reveal its records", async () => {
    renderWithProviders(<AppSidebar />);
    // Wait for the records query before interacting (accessible names
    // collapse whitespace: "Places(2)▸").
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: /Places\(2\)/ })).toBeDefined(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Places\(2\)/ }));
    expect(screen.getByText("City of Glass")).toBeDefined();
    expect(screen.getByText("Silver City")).toBeDefined();
    // Monsters stays collapsed.
    expect(screen.queryByText("The Undying")).toBeNull();
  });

  it("highlights the active record and its category header", async () => {
    routerState.pathname = "/records/city-of-glass";
    renderWithProviders(<AppSidebar />);
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: /Places\(2\)/ })).toBeDefined(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Places\(2\)/ }));
    const link = screen.getByText("City of Glass").closest("a");
    expect(link?.className).toContain("bg-accent");
    const placesHeader = screen.getByRole("button", { name: /Places\(2\)/ });
    expect(placesHeader.className).toContain("bg-accent/20");
    const monstersHeader = screen.getByRole("button", { name: /Monsters\(1\)/ });
    expect(monstersHeader.className).not.toContain("bg-accent/20");
  });
});
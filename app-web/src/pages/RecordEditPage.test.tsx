import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { RecordEditPage } from "./RecordEditPage";
import { renderWithProviders } from "../testing/render.js";

// Mutable search state the mocked router hook exposes; tests set the edit
// flag to simulate navigation straight from a creation form.
const searchState: { edit?: string | boolean } = {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ slug: "city-of-glass" }),
    useNavigate: () => ({ to: vi.fn() }),
    useRouterState: (opts?: { select?: (s: unknown) => unknown }) => {
      const state = {
        location: { pathname: "/records/city-of-glass", search: searchState },
      };
      return opts?.select ? opts.select(state) : state;
    },
    // The reading view renders references through Link; a plain anchor
    // keeps the assertion independent of the router tree.
    Link: (props: { params?: { slug?: string }; children?: ReactNode }) => (
      <a href={`#${props.params?.slug ?? ""}`}>{props.children}</a>
    ),
  };
});

function recordOf(
  fields: Record<string, unknown>,
  references: Record<string, Array<{ slug: string; title: string }>> = {},
) {
  return {
    id: "1",
    slug: "city-of-glass",
    type: "places",
    perimeter: "world",
    title: "City of Glass",
    tags: [],
    fields,
    references,
  };
}

function stubFetch(record: unknown) {
  return vi.stubGlobal(
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
      if (input.endsWith("/backlinks")) {
        return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
      }
      return { ok: true, json: async () => record };
    }),
  );
}

describe("RecordEditPage", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    searchState.edit = undefined;
    stubFetch(recordOf({ population: "1M" }));
  });

  it("renders the edit form pre-filled and saves via PATCH", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.endsWith("/backlinks")) {
        return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
      }
      return { ok: true, json: async () => recordOf({ population: "1M" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    // Opens in reading mode; entering edit mounts the form.
    expect(document.querySelector("form")).toBeNull();
    screen.getByText("Edit").click();
    await vi.waitFor(() => expect(document.querySelector("form")).not.toBeNull());
    const title = document.querySelector('input[name="title"]');
    expect((title as HTMLInputElement | null)?.value).toBe("City of Glass");
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    // The generated form renders the Places template fields (phase 4).
    const population = form.querySelector('input[name="population"]');
    if (!population) throw new Error("population missing");
    fireEvent.input(population, { target: { value: "2M" } });
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      const calls = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>);
      const patch = calls.find(([path, init]) => path === "/api/records/city-of-glass" && init?.method === "PATCH");
      expect(patch).toBeDefined();
      const payload = JSON.parse(String(patch![1].body)) as { fields: Record<string, unknown> };
      expect(payload.fields).toEqual({ population: "2M" });
    });
  });

  it("shows a success confirmation after saving", async () => {
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    screen.getByText("Edit").click();
    await vi.waitFor(() => expect(document.querySelector("form")).not.toBeNull());
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(screen.getByText("Saved.")).toBeDefined());
  });

  it("opens in reading mode by default", async () => {
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    expect(document.querySelector("form")).toBeNull();
    expect(screen.getByText("Edit")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("opens straight into edit mode from a creation redirect", async () => {
    // validateSearch normalizes edit=1 to the boolean true; the raw string
    // must keep working too.
    searchState.edit = true;
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    await vi.waitFor(() => expect(document.querySelector("form")).not.toBeNull());

    searchState.edit = "1";
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() => expect(document.querySelector("form")).not.toBeNull());
  });

  it("translates enum values in the reading view", async () => {
    stubFetch(recordOf({ place_type: "intangible_place", population: "1M" }));
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(screen.getByText("Intangible place")).toBeDefined(),
    );
    // The raw enum key never reaches the reader.
    expect(screen.queryByText("intangible_place")).toBeNull();
  });

  it("renders calendar dates through the world definition", async () => {
    // The events template carries the start date field.
    const eventRecord = { ...recordOf({}), type: "events", fields: { start: { year: 842, month: 1, day: 5 } } };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input === "/api/settings/calendar") {
          return {
            ok: true,
            json: async () => ({
              months: [{ name: "M1", days: 30 }, { name: "M2", days: 31 }],
              week: { days: 8 },
              dayNames: ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"],
              moon: { name: "Lune", cycleDays: 29 },
              currentYear: 842,
            }),
          };
        }
        if (input === "/api/records/city-of-glass/backlinks") {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        if (input === "/api/records/city-of-glass") {
          return { ok: true, json: async () => eventRecord };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(screen.getByText("M1 5, 842")).toBeDefined(),
    );
  });

  it("renders prose fields through the readonly editor", async () => {
    stubFetch(recordOf({ public_description: "Sunlit **towers**." }));
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".ProseMirror")).toHaveLength(1),
    );
    // Markdown renders (bold stays bold), no editing toolbar in reading mode.
    expect(document.querySelector("strong")?.textContent).toBe("towers");
    expect(document.querySelector('[role="toolbar"]')).toBeNull();
  });

  it("renders references as links to the referenced records", async () => {
    stubFetch(
      recordOf(
        { population: "1M" },
        {
          region: [
            { slug: "the-glass-region", title: "The Glass Region" },
            { slug: "alpha-isle", title: "Alpha Isle" },
          ],
        },
      ),
    );
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() =>
      expect(screen.getByText("The Glass Region")).toBeDefined(),
    );
    // Title-sorted, comma-separated.
    const dd = screen.getByText("The Glass Region").closest("dd")!;
    expect(dd.textContent).toBe("Alpha Isle, The Glass Region");
    const link = screen.getByText("The Glass Region").closest("a");
    expect(link?.getAttribute("href")).toBe("#the-glass-region");
  });
});

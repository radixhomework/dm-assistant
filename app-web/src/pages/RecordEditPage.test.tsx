import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ChapterRecordPage, LoreRecordPage } from "./RecordEditPage";
import { searchFlagTrue } from "../router/search-flag.js";
import { renderWithProviders } from "../testing/render.js";

// Mutable search state the mocked router hook exposes; tests set the edit
// flag to simulate navigation straight from a creation form.
const searchState: { edit?: string | boolean } = {};
// Route params for the mocked useParams; the lore tests keep this default.
const paramState: Record<string, string> = { id: "rec-1" };

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    // Mutable so route-specific tests can set their own params.
    useParams: () => paramState,
    useNavigate: () => ({ to: vi.fn() }),
    useRouterState: (opts?: { select?: (s: unknown) => unknown }) => {
      const state = {
        location: { pathname: "/records/city-of-glass", search: searchState },
      };
      return opts?.select ? opts.select(state) : state;
    },
    // The reading view renders references through Link; a plain anchor
    // keeps the assertion independent of the router tree.
    Link: (props: { params?: Record<string, string>; children?: ReactNode }) => (
      <a
        href={
          props.params
            ? "#" + Object.entries(props.params).map(([k, v]) => `${k}=${v}`).join("&")
            : "#"
        }
      >
        {props.children}
      </a>
    ),
  };
});

function recordOf(
  fields: Record<string, unknown>,
  references: Record<
    string,
    Array<{ id: string; slug: string; title: string }>
  > = {},
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
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    // Opens in reading mode; entering edit mounts the form.
    expect(document.querySelector("form")).toBeNull();
    screen.getByRole("button", { name: "Edit" }).click();
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
      const patch = calls.find(([path, init]) => path === "/api/records/rec-1" && init?.method === "PATCH");
      expect(patch).toBeDefined();
      const payload = JSON.parse(String(patch![1].body)) as { fields: Record<string, unknown> };
      expect(payload.fields).toEqual({ population: "2M" });
    });
  });

  it("shows a success confirmation after saving", async () => {
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    screen.getByRole("button", { name: "Edit" }).click();
    await vi.waitFor(() => expect(document.querySelector("form")).not.toBeNull());
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(screen.getByText("Saved.")).toBeDefined());
  });

  it("opens in reading mode by default", async () => {
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    expect(document.querySelector("form")).toBeNull();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
    expect(screen.getByRole("button", { name: "New record" })).toBeDefined();
  });

  it("saves through the header Save icon and returns to reading on Cancel", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.endsWith("/backlinks")) {
        return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
      }
      return { ok: true, json: async () => recordOf({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    // Enter edit, then submit through the header Save icon (outside the
    // form element, wired through the form id).
    screen.getByRole("button", { name: "Edit" }).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).not.toBeNull());
    (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).click();
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
      expect(calls.some(([path, i]) => path === "/api/records/rec-1" && i?.method === "PATCH")).toBe(true);
    });
    // Back in reading; the header shows the reading actions again.
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).toBeNull());
    // Cancel returns to reading without a PATCH.
    screen.getByRole("button", { name: "Edit" }).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).not.toBeNull());
    (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).toBeNull());
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const patches = calls.filter(([path, init]) => path === "/api/records/rec-1" && init?.method === "PATCH");
    expect(patches).toHaveLength(1);
  });

  it.each([true, "1", 1])(
    "opens straight into edit mode from a creation redirect with edit=%j",
    async (edit) => {
      // The route validator normalizes the numeric value parsed from ?edit=1.
      searchState.edit = typeof edit === "number" ? searchFlagTrue({ edit }, "edit") : edit;
      const { container } = renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
      await vi.waitFor(() =>
        expect(container.querySelector("form#record-edit-form")).not.toBeNull(),
      );
    },
  );

  it("lists the campaign children through the tracking view", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        return {
          ok: true,
          json: async () => ({
            ...recordOf({}),
            type: "campaign",
            tracking: { children: [{ slug: "chap1", title: "Chap1" }] },
          }),
        };
      }),
    );
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() => expect(screen.getByText("Chapters")).toBeDefined());
    expect(screen.getByText("Chap1")).toBeDefined();
  });

  it("discards the field draft on cancel instead of leaking it back", async () => {
    stubFetch(recordOf({ population: "1M" }));
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    screen.getByRole("button", { name: "Edit" }).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).not.toBeNull());
    const populationInput = document.querySelector(
      'input[name="population"]',
    ) as HTMLInputElement;
    expect(populationInput.value).toBe("1M");
    fireEvent.input(populationInput, { target: { value: "2M" } });
    expect(
      (document.querySelector('input[name="population"]') as HTMLInputElement).value,
    ).toBe("2M");
    // Cancel discards the draft — re-editing seeds from the saved
    // record, not from the abandoned "2M".
    (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).toBeNull());
    screen.getByRole("button", { name: "Edit" }).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).not.toBeNull());
    expect(
      (document.querySelector('input[name="population"]') as HTMLInputElement).value,
    ).toBe("1M");
  });

  it("translates enum values in the reading view", async () => {
    stubFetch(recordOf({ place_type: "intangible_place", population: "1M" }));
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("Intangible place")).toBeDefined(),
    );
    // The raw enum key never reaches the reader.
    expect(screen.queryByText("intangible_place")).toBeNull();
  });

  it("renders a year-only date at its own granularity", async () => {
    // A bare year (optionally era-prefixed) uses the year format — the
    // month format with an empty month would render a stray space.
    const eventRecord = { ...recordOf({}), type: "events", fields: { start: { era: "An", year: 842 } } };
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
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        if (input === "/api/records/rec-1") {
          return { ok: true, json: async () => eventRecord };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() => expect(screen.getByText("An 842")).toBeDefined());
    // No month-format rendering for a year-only date.
    expect(screen.queryByText(" 842")).toBeNull();
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
        // The backlinks query keys on the record's slug, not its uuid.
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        if (input === "/api/records/rec-1") {
          return { ok: true, json: async () => eventRecord };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() => {
      // The EventSheet renders the date chip as a label span + value
      // span: assert on the whole chip.
      const chip = screen
        .getByText("Start")
        .closest('span[class*="rounded-md"]');
      expect(chip?.textContent).toBe("Start M1 5, 842");
    });
  });

  it("renders prose fields through the readonly editor", async () => {
    stubFetch(recordOf({ public_description: "Sunlit **towers**." }));
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".ProseMirror")).toHaveLength(1),
    );
    // Markdown renders (bold stays bold), no editing toolbar in reading mode.
    expect(document.querySelector("strong")?.textContent).toBe("towers");
    expect(document.querySelector('[role="toolbar"]')).toBeNull();
  });

  it("renders references as links to the referenced records", async () => {
    // The link routes resolve each target through its uuid: the stub
    // answers the target lookups with world-record payloads.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input === "/api/records/rec-1/backlinks" || input === "/api/records/city-of-glass/backlinks") {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        if (input === "/api/records/rec-1") {
          return {
            ok: true,
            json: async () =>
              recordOf(
                { population: "1M" },
                {
                  leaders: [
                    { id: "uuid-glass-region", slug: "the-glass-region", title: "The Glass Region" },
                    { id: "uuid-alpha-isle", slug: "alpha-isle", title: "Alpha Isle" },
                  ],
                },
              ),
          };
        }
        if (input === "/api/records/uuid-glass-region") {
          return {
            ok: true,
            json: async () => ({
              id: "uuid-glass-region",
              slug: "the-glass-region",
              type: "places",
              perimeter: "world",
              title: "The Glass Region",
              tags: [],
              fields: {},
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("The Glass Region")).toBeDefined(),
    );
    // Title-sorted, comma-separated.
    const dd = screen.getByText("The Glass Region").closest("dd")!;
    expect(dd.textContent).toBe("Alpha Isle, The Glass Region");
    // Each link carries its target's uuid route params (the stub answers
    // the world-record payloads, so the params point at /lore/<uuid>).
    await vi.waitFor(() => {
      const link = screen.getByText("The Glass Region").closest("a");
      expect(link?.getAttribute("href")).toContain("id=uuid-glass-region");
    });
  });

  it("shows the error state when the record request fails", async () => {
    // The failure must surface even though the field draft can never
    // initialize: the error check precedes the draft-initialization wait.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input === "/api/records/rec-1") {
          return { ok: false, status: 500, json: async () => ({ message: "boom" }) };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("Something went wrong")).toBeDefined(),
    );
    // Never stuck on the loading message.
    expect(screen.queryByText("Loading…")).toBeNull();
  });

  it("pins the edit session while a save is pending", async () => {
    let resolvePatch!: (response: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        if (input === "/api/records/rec-1" && init?.method === "PATCH") {
          // Hang until the test resolves it: the save is pending.
          return new Promise((resolve) => {
            resolvePatch = resolve;
          });
        }
        return { ok: true, json: async () => recordOf({}) };
      }),
    );
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    screen.getByRole("button", { name: "Edit" }).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).not.toBeNull());
    (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
    });
    // The draft is pinned too: the form is inert while the save is in
    // flight, so a late edit can never diverge from the PATCH in flight.
    expect(document.querySelector("#record-edit-form")!.hasAttribute("inert")).toBe(true);
    // The completing save closes THIS session and no other: no newer
    // session can open while the controls are pinned.
    resolvePatch({ ok: true, json: async () => recordOf({}) });
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).toBeNull());
    expect((screen.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("restores the save and cancel controls when the save fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        if (input === "/api/records/rec-1" && init?.method === "PATCH") {
          return { ok: false, status: 500, json: async () => ({ message: "boom" }) };
        }
        return { ok: true, json: async () => recordOf({}) };
      }),
    );
    renderWithProviders(<LoreRecordPage />, "/lore/rec-1");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    screen.getByRole("button", { name: "Edit" }).click();
    await vi.waitFor(() => expect(document.querySelector("#record-edit-form")).not.toBeNull());
    (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).click();
    await vi.waitFor(() => expect(screen.getByText(/boom/)).toBeDefined());
    // The failure leaves the session open with working controls.
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(false);
    expect(document.querySelector("#record-edit-form")!.hasAttribute("inert")).toBe(false);
  });
});


describe("ChapterRecordPage header", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    paramState["id"] = "camp-1";
    paramState["chapterId"] = "chap-1";
    searchState.edit = undefined;
  });

  it("offers Edit and Delete but no creation shortcut", async () => {
    const fetchMock = vi.fn(async (input: string) => {
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
      if (input.endsWith("/api/records/chap-1")) {
        return {
          ok: true,
          json: async () => ({
            ...recordOf({}),
            id: "chap-1",
            slug: "chap-one",
            type: "chapter",
            campaign: { id: "camp-1", slug: "north-realm", title: "The North Realm" },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<ChapterRecordPage />, "/campaigns/camp-1/chap-1");
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit" })).toBeDefined(),
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "New record" })).toBeNull();
  });
});

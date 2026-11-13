import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { CalendarPage } from "./CalendarPage";
import { renderWithProviders } from "../testing/render.js";
import type { CalendarSettings } from "@dm/schemas";

const definition: CalendarSettings = {
  months: [
    { name: "M1", days: 30 },
    { name: "M2", days: 31 },
  ],
  week: { days: 8 },
  dayNames: ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"],
  moon: { name: "Lune", cycleDays: 29 },
  currentYear: 842,
};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
    useNavigate: () => vi.fn(),
  };
});

function stubFetch(options: { definition: CalendarSettings | null; events: unknown[] }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/auth/me") {
        return {
          ok: true,
          json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
        };
      }
      if (input === "/api/settings/calendar") {
        return { ok: true, json: async () => options.definition };
      }
      if (input === "/api/records?type=events&perimeter=world") {
        return { ok: true, json: async () => options.events };
      }
      return { ok: true, status: 204, json: async () => ({}) };
    }),
  );
}

const events = [
  {
    slug: "fete",
    title: "Fête du marché",
    type: "events",
    perimeter: "world",
    tags: [],
    fields: { start: { year: 842, month: 1, day: 5 } },
  },
];

describe("CalendarPage", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows the empty state before the calendar is defined", async () => {
    stubFetch({ definition: null, events: [] });
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("The world calendar is not defined yet.")).toBeDefined(),
    );
  });

  it("renders the month grid with an indicator on event days", async () => {
    stubFetch({ definition, events });
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("M1")).toBeDefined(),
    );
    // The event day renders with the indicator background.
    const dayButton = screen.getAllByTitle("5 M1")[0];
    expect(dayButton.className).toContain("bg-accent/20");
  });

  it("lists the day's events when the day is clicked", async () => {
    stubFetch({ definition, events });
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() => expect(screen.getByText("M1")).toBeDefined());
    fireEvent.click(screen.getAllByTitle("5 M1")[0]);
    await vi.waitFor(() =>
      expect(screen.getByText("Fête du marché")).toBeDefined(),
    );
  });

  it("shows the moon cycle per day with its legend", async () => {
    stubFetch({ definition, events });
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() => expect(screen.getByText("M1")).toBeDefined());
    // One moon glyph per day cell (30 + 31 days) and the four-phase legend.
    expect(document.querySelectorAll('svg[class*="size-2.5"]').length).toBe(65);
    expect(screen.getByText("New moon")).toBeDefined();
    expect(screen.getByText("Full moon")).toBeDefined();
  });

  it("jumps to a typed year", async () => {
    stubFetch({ definition, events });
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() => expect(screen.getByText("M1")).toBeDefined());
    const yearInput = screen.getByRole("spinbutton", { name: "Go to year" }) as HTMLInputElement;
    fireEvent.change(yearInput, { target: { value: "500" } });
    fireEvent.submit(yearInput.closest("form")!);
    await vi.waitFor(() => expect(yearInput.value).toBe("500"));
  });

  it("creates an event from the day's section with the day as start", async () => {
    const captured: Array<[string, RequestInit]> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input === "/api/settings/calendar") return { ok: true, json: async () => definition };
        if (input === "/api/records?type=events&perimeter=world") return { ok: true, json: async () => events };
        if (input === "/api/records" && init?.method === "POST") {
          captured.push([input, init]);
          return { ok: true, json: async () => ({ slug: "nouveau" }) };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() => expect(screen.getByText("M1")).toBeDefined());
    fireEvent.click(screen.getAllByTitle("5 M1")[0]);
    fireEvent.click(screen.getByRole("button", { name: "New event on this day" }));
    await vi.waitFor(() => expect(screen.getByRole("textbox", { name: "Title" })).toBeDefined());
    fireEvent.input(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Fête du jour" } });
    fireEvent.submit(screen.getByRole("textbox", { name: "Title" }).closest("form")!);
    await vi.waitFor(() => {
      const post = captured.find(([_path, init]) => init?.method === "POST");
      expect(post).toBeDefined();
      const payload = JSON.parse(String(post![1].body)) as { fields: { start: { year: number; month: number; day: number } } };
      expect(payload.fields.start).toEqual({ year: 842, month: 1, day: 5 });
    });
  });

  it("navigates years and skips the missing year 0", async () => {
    stubFetch({
      definition: { ...definition, currentYear: 1 },
      events: [
        {
          slug: "naissance",
          title: "Naissance",
          type: "events",
          perimeter: "world",
          tags: [],
          fields: { start: { year: 1, month: 1, day: 1 } },
        },
      ],
    });
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() => expect(screen.getByText("M1")).toBeDefined());
    // Default year = the event's year (1): the day lists the event.
    fireEvent.click(screen.getAllByTitle("1 M1")[0]);
    await vi.waitFor(() => expect(screen.getByText("Naissance")).toBeDefined());
    // Previous from year 1 lands on −1 (year 0 does not exist); the
    // event's day is now empty.
    const yearInput = screen.getByRole("spinbutton", { name: "Go to year" }) as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
    await vi.waitFor(() => expect(yearInput.value).toBe("-1"));
    expect(screen.queryByText("Naissance")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));
    await vi.waitFor(() => expect(yearInput.value).toBe("1"));
  });
});

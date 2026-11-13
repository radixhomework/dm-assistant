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
};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
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

  it("navigates years and skips the missing year 0", async () => {
    stubFetch({
      definition,
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
    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
    await vi.waitFor(() =>
      expect(document.querySelector("span.font-display.text-2xl")?.textContent).toBe("-1"),
    );
    expect(screen.queryByText("Naissance")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next year" }));
    await vi.waitFor(() =>
      expect(document.querySelector("span.font-display.text-2xl")?.textContent).toBe("1"),
    );
  });
});

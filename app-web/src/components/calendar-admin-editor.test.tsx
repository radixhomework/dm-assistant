import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { CalendarAdminEditor } from "./calendar-admin-editor.js";
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

function stubFetch(captured: Array<[string, RequestInit]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/settings/calendar") {
        return { ok: true, json: async (): Promise<CalendarSettings> => definition };
      }
      if (input === "/api/admin/settings/calendar" && init?.method === "PATCH") {
        captured.push([input, init]);
        return { ok: true, json: async (): Promise<CalendarSettings> => definition };
      }
      return { ok: true, status: 204, json: async (): Promise<Record<string, never>> => ({}) };
    }),
  );
}

describe("CalendarAdminEditor", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
  });

  it("renders the saved definition for editing", async () => {
    const captured: Array<[string, RequestInit]> = [];
    stubFetch(captured);
    renderWithProviders(<CalendarAdminEditor />);
    await vi.waitFor(() => {
      const names = screen.getAllByPlaceholderText("Name").map(
        (input) => (input as HTMLInputElement).value,
      );
      expect(names).toEqual(["M1", "M2"]);
    });
    expect((screen.getByLabelText("Days per week") as HTMLInputElement).value).toBe("8");
    // Week shortening trims the extra day-name inputs.
    fireEvent.change(screen.getByLabelText("Days per week"), { target: { value: "5" } });
    expect(screen.getAllByPlaceholderText("Name")).toHaveLength(2);
  });

  it("saves the edited definition through the admin endpoint", async () => {
    const captured: Array<[string, RequestInit]> = [];
    stubFetch(captured);
    renderWithProviders(<CalendarAdminEditor />);
    await vi.waitFor(() => {
      const names = screen.getAllByPlaceholderText("Name").map(
        (input) => (input as HTMLInputElement).value,
      );
      expect(names).toEqual(["M1", "M2"]);
    });
    fireEvent.change(screen.getByLabelText("Days per week"), { target: { value: "7" } });
    fireEvent.click(screen.getByText("Save"));
    await vi.waitFor(() => {
      const patch = captured.find(([_path, init]) => init?.method === "PATCH");
      expect(patch).toBeDefined();
      const payload = JSON.parse(String(patch![1].body)) as {
        week: { days: number };
        currentYear: number;
        months: Array<{ name: string; days: number }>;
      };
      expect(payload.week.days).toBe(7);
      expect(payload.months).toEqual([
        { name: "M1", days: 30 },
        { name: "M2", days: 31 },
      ]);
      expect(payload.currentYear).toBe(842);
    });
  });

  it("adds and removes month rows and edits moon and current year", async () => {
    const captured: Array<[string, RequestInit]> = [];
    stubFetch(captured);
    renderWithProviders(<CalendarAdminEditor />);
    await vi.waitFor(() =>
      expect(screen.getAllByPlaceholderText("Name").length).toBe(2),
    );
    // Add a third month, then remove the last one again.
    fireEvent.click(screen.getByText("Add a month"));
    expect(screen.getAllByPlaceholderText("Name")).toHaveLength(3);
    const removeButtons = [...screen.getAllByLabelText("Remove")];
    fireEvent.click(removeButtons[removeButtons.length - 1]);
    expect(screen.getAllByPlaceholderText("Name")).toHaveLength(2);
    // Moon and current-year inputs flow into the saved payload.
    fireEvent.input(screen.getByLabelText("Cycle (days)"), { target: { value: "31" } });
    fireEvent.input(screen.getByLabelText("Current year"), { target: { value: "900" } });
    fireEvent.click(screen.getByText("Save"));
    await vi.waitFor(() => {
      const patch = captured.find(([_path, init]) => init?.method === "PATCH");
      expect(patch).toBeDefined();
      const payload = JSON.parse(String(patch![1].body)) as { moon: { cycleDays: number }; currentYear: number };
      expect(payload.moon.cycleDays).toBe(31);
      expect(payload.currentYear).toBe(900);
      expect(screen.getByText("Calendar saved.")).toBeDefined();
    });
  });

  it("starts from a blank draft when no definition exists yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/settings/calendar") {
          return { ok: true, json: async (): Promise<null> => null };
        }
        return { ok: true, status: 204, json: async (): Promise<Record<string, never>> => ({}) };
      }),
    );
    renderWithProviders(<CalendarAdminEditor />);
    await vi.waitFor(() =>
      expect(screen.getAllByPlaceholderText("Name").length).toBeGreaterThan(0),
    );
    expect((screen.getByLabelText("Days per week") as HTMLInputElement).value).toBe("7");
    // A failed save surfaces the error instead of the saved banner.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          return { ok: false, status: 500, json: async (): Promise<Record<string, never>> => ({}) };
        }
        return { ok: true, json: async (): Promise<null> => null };
      }),
    );
    fireEvent.click(screen.getByText("Save"));
    await vi.waitFor(() => expect(document.body.textContent).toContain("Error"));
  });
});

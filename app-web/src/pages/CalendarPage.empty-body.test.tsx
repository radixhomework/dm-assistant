import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarPage } from "./CalendarPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}));

describe("CalendarPage empty body", () => {
  it("treats an empty calendar response as no definition", async () => {
    // A fresh database: the settings endpoint answers an empty 200 body,
    // res.json() fails, the api client answers undefined. react-query v5
    // treats an undefined result as an error — the page must normalize
    // to null and show the definition prompt, not the load error.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return { ok: true, json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }) };
        }
        if (input === "/api/settings/calendar") {
          return {
            ok: true,
            json: async () => {
              throw new SyntaxError("Unexpected end of JSON input");
            },
          };
        }
        if (input === "/api/records?type=events&perimeter=world") {
          return { ok: true, json: async () => [] };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<CalendarPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("The world calendar is not defined yet.")).toBeDefined(),
    );
    // Not the load-error state, and Retry stays silent.
    expect(screen.queryByText("Loading the calendar or the events failed.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});

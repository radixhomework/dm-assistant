import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordEditPage } from "./RecordEditPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ slug: "city-of-glass" }),
  useNavigate: () => ({ to: vi.fn() }),
  useRouterState: (opts?: { select?: (s: unknown) => unknown }) =>
    opts?.select
      ? opts.select({ location: { pathname: "/records/city-of-glass", search: {} } })
      : { location: { pathname: "/records/city-of-glass", search: {} } },
}));

describe("RecordEditPage delete", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string) => {
        if (_input === "/api/auth/me") {
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
        return {
          ok: true,
          json: async () => ({
            id: "1",
            slug: "city-of-glass",
            type: "places",
            perimeter: "world",
            title: "City of Glass",
            tags: [],
            fields: {},
            body: "",
          }),
        };
      }),
    );
  });

  it("sends DELETE when the delete button is clicked", async () => {
    const fetchMock = vi.fn(async (input: string, _init?: RequestInit) => {
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
      return {
        ok: true,
        json: async () => ({
          id: "1",
          slug: "city-of-glass",
          type: "places",
          perimeter: "world",
          title: "City of Glass",
          tags: [],
          fields: {},
          body: "",
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<RecordEditPage />, "/records/city-of-glass");
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      expect(calls.some(([path]) => path === "/api/records/city-of-glass")).toBe(true);
    });
    const deleteButton = [...document.querySelectorAll("button")].find((button) =>
      button.textContent === "Delete",
    );
    if (!deleteButton) throw new Error("delete button missing");
    deleteButton.click();
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const deletion = calls.find(
        ([path, init]) => path === "/api/records/city-of-glass" && init?.method === "DELETE",
      );
      expect(deletion).toBeDefined();
    });
  });
});

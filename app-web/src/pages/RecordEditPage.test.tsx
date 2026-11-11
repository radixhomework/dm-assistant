import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { RecordEditPage } from "./RecordEditPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ slug: "city-of-glass" }),
  useNavigate: () => ({ to: vi.fn() }),
}));

describe("RecordEditPage", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
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
        return {
          ok: true,
          json: async () => ({
            id: "1",
            slug: "city-of-glass",
            type: "places",
            perimeter: "world",
            title: "City of Glass",
            tags: ["capital"],
            fields: { population: "1M" },
            body: "A city of towers.",
          }),
        };
      }),
    );
  });

  it("renders the edit form pre-filled and saves via PATCH", async () => {
    const fetchMock = vi.fn(async (_input: string) => ({
      ok: true,
      json: async () => ({
        id: "1",
        slug: "city-of-glass",
        type: "places",
        perimeter: "world",
        title: "City of Glass",
        tags: ["capital"],
        fields: { population: "1M" },
        body: "A city of towers.",
      }),
    }));
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
    const fields = form.querySelector('textarea[name="fields"]');
    if (!fields) throw new Error("fields missing");
    (fields as HTMLTextAreaElement).value = '{"population":"2M"}';
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      const calls = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>);
      const patch = calls.find(([path, init]) => path === "/api/records/city-of-glass" && init?.method === "PATCH");
      expect(patch).toBeDefined();
    });
  });

  it("shows a success confirmation after saving", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: string) => ({
        ok: true,
        json: async () => ({
          id: "1",
          slug: "city-of-glass",
          type: "places",
          perimeter: "world",
          title: "City of Glass",
          tags: [],
          fields: {},
          body: "A city of towers.",
        }),
      })),
    );
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
});

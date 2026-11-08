import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { LorePage } from "./LorePage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => ({ to: vi.fn() }),
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}));

describe("LorePage create", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
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
        if (input === "/api/records" && init?.method === "POST") {
          return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => [] };
      }),
    );
  });

  it("creates a world record via the creation form", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
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
      if (input === "/api/records" && init?.method === "POST") {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: true, json: async () => [] };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<LorePage />, "/");
    await vi.waitFor(() =>
      expect(screen.getByText("New record")).toBeDefined(),
    );
    screen.getByText("New record").click();
    await vi.waitFor(() => {
      const form = document.querySelector("form");
      expect(form).not.toBeNull();
    });
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    const type = form.querySelector('select[name="type"]');
    if (!type) throw new Error("type missing");
    (type as HTMLSelectElement).value = "places";
    for (const [name, value] of [
      ["slug", "city-of-glass"],
      ["title", "City of Glass"],
    ] as Array<[string, string]>) {
      const field = form.querySelector(`input[name="${name}"]`);
      if (!field) throw new Error(`${name} missing`);
      (field as HTMLInputElement).value = value;
    }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const post = calls.find(
        ([path, init]) => path === "/api/records" && init?.method === "POST",
      );
      expect(post).toBeDefined();
    });
  });
});

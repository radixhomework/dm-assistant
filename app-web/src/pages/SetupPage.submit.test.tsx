import { beforeEach, describe, expect, it, vi } from "vitest";
import { SetupPage } from "./SetupPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => ({ to: vi.fn() }),
}));

describe("SetupPage submit", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | RequestInfo, init?: RequestInit) => {
        if (input === "/api/bootstrap" && (!init || !init.method)) {
          return {
            ok: true,
            json: async () => ({ adminExists: false }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
  });

  it("posts the wizard payload on submit", async () => {
    const fetchMock = vi.fn(async (input: string | RequestInfo, init?: RequestInit) => {
      if (input === "/api/bootstrap" && (!init || !init.method)) {
        return {
          ok: true,
          json: async () => ({ adminExists: false }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<SetupPage />, "/setup");
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    for (const [name, value] of [
      ["email", "admin@example.com"],
      ["password", "a-long-enough-passphrase"],
      ["displayName", "The DM"],
      ["worldName", "My World"],
    ] as Array<[string, string]>) {
      const field = form.querySelector(`input[name="${name}"]`);
      if (!field) throw new Error(`${name} missing`);
      (field as HTMLInputElement).value = value;
    }

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const post = calls.find(
        ([path, init]) => path === "/api/bootstrap" && init?.method === "POST",
      );
      expect(post).toBeDefined();
    });
  });
});

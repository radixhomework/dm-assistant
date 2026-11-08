import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AdminPage } from "./AdminPage";
import { renderWithProviders } from "../testing/render.js";

function mockAs(role: "admin" | "dm") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | RequestInfo, _init?: RequestInit) => {
      console.log("FETCH CALLED:", input);
      if (input === "/api/auth/me") {
        return {
          ok: true,
          json: async () => ({
            id: "1",
            email: "a@b.c",
            displayName: "DM",
            role,
          }),
        };
      }
      if (input === "/api/admin/users") {
        return {
          ok: true,
          json: async () => [
            {
              id: "1",
              email: "a@b.c",
              displayName: "DM",
              role: "admin",
              status: "active",
            },
          ],
        };
      }
      return {
        ok: true,
        json: async () => ({
          worldName: null,
          contentLanguage: "en",
          distanceUnit: "m",
          weightUnit: "kg",
        }),
      };
    }),
  );
}

describe("AdminPage", () => {
  beforeAll(() => {});

  it("shows users for an admin", async () => {
    mockAs("admin");
    renderWithProviders(<AdminPage />, "/admin");
    await vi.waitFor(() =>
      expect(screen.getByText(/a@b.c/)).toBeDefined(),
    );
    expect(screen.getByText("Users")).toBeDefined();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AdminPage } from "./AdminPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => ({ to: vi.fn() }),
}));

function mockInstance(captured: Array<[string, RequestInit]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      captured.push([input, init ?? {}]);
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
      if (input === "/api/admin/users") {
        return {
          ok: true,
          json: async () => [
            {
              id: "u1",
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
          worldName: "W",
          contentLanguage: "en",
          distanceUnit: "m",
          weightUnit: "kg",
        }),
      };
    }),
  );
}

describe("AdminPage actions", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
  });

  it("creates a user via the admin panel form", async () => {
    const captured: Array<[string, RequestInit]> = [];
    mockInstance(captured);
    renderWithProviders(<AdminPage />, "/admin");
    await vi.waitFor(() =>
      expect(screen.getByText("Create user")).toBeDefined(),
    );
    screen.getByText("Create user").click();
    await vi.waitFor(() => {
      const form = document.querySelector("form");
      expect(form).not.toBeNull();
    });
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    for (const [name, value] of [
      ["email", "new@example.com"],
      ["password", "a-long-enough-passphrase"],
      ["displayName", "New DM"],
    ] as Array<[string, string]>) {
      const field = form.querySelector(`input[name="${name}"]`);
      if (!field) throw new Error(`${name} missing`);
      (field as HTMLInputElement).value = value;
    }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      const post = captured.find(
        ([path, init]) => path === "/api/admin/users" && init?.method === "POST",
      );
      expect(post).toBeDefined();
    });
  });

  it("blocks an account via the status button", async () => {
    const captured: Array<[string, RequestInit]> = [];
    mockInstance(captured);
    renderWithProviders(<AdminPage />, "/admin");
    await vi.waitFor(() => expect(screen.getByText("Block")).toBeDefined());
    screen.getByText("Block").click();
    await vi.waitFor(() => {
      const patch = captured.find(
        ([path, init]) =>
          path === "/api/admin/users/u1/status" && init?.method === "PATCH",
      );
      expect(patch).toBeDefined();
    });
  });

  it("deletes a user via the delete button after confirmation", async () => {
    const captured: Array<[string, RequestInit]> = [];
    mockInstance(captured);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<AdminPage />, "/admin");
    await vi.waitFor(() => expect(screen.getByText("Delete")).toBeDefined());
    screen.getByText("Delete").click();
    await vi.waitFor(() => {
      const removed = captured.find(
        ([path, init]) => path === "/api/admin/users/u1" && init?.method === "DELETE",
      );
      expect(removed).toBeDefined();
    });
    expect(confirmSpy).toHaveBeenCalled();
  });

  it("saves instance settings via the settings form", async () => {
    const captured: Array<[string, RequestInit]> = [];
    mockInstance(captured);
    renderWithProviders(<AdminPage />, "/admin");
    await vi.waitFor(() => expect(screen.getByText("Save")).toBeDefined());
    screen.getByText("Save").click();
    await vi.waitFor(() => {
      const patch = captured.find(
        ([path, init]) => path === "/api/admin/settings" && init?.method === "PATCH",
      );
      expect(patch).toBeDefined();
    });
  });
});

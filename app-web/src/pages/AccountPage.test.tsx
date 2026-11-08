import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { AccountPage } from "./AccountPage";
import { renderWithProviders } from "../testing/render.js";

let profilePayload: Record<string, unknown> | null = null;

function mockApi() {
  profilePayload = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/me" && (!init?.method || init.method === "GET")) {
        return {
          ok: true,
          json: async () => ({
            id: "1",
            email: "dm@instance.test",
            displayName: "DM",
            role: "admin",
            uiLocale: null,
          }),
        };
      }
      if (input === "/api/auth/me/password" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, string>;
        if (body.currentPassword !== "correct-horse-12") {
          return { ok: false, status: 401, json: async () => ({ message: "wrong" }) };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }
      if (input === "/api/auth/me" && init?.method === "PATCH") {
        profilePayload = JSON.parse(String(init.body)) as Record<string, unknown>;
        return {
          ok: true,
          json: async () => ({ id: "1", email: profilePayload?.email, displayName: profilePayload?.displayName, role: "admin", uiLocale: profilePayload?.uiLocale ?? null }),
        };
      }
      return { ok: true, status: 204, json: async () => ({}) };
    }),
  );
}

describe("AccountPage", () => {
  beforeEach(() => {
    mockApi();
  });

  it("saves the profile through PATCH /api/auth/me", async () => {
    renderWithProviders(<AccountPage />);
    await vi.waitFor(() => expect(screen.getByDisplayValue("dm@instance.test")).toBeDefined());
    fireEvent.change(screen.getByDisplayValue("DM"), { target: { value: "Head DM" } });
    fireEvent.click(screen.getByText("Save profile"));
    await vi.waitFor(() => expect(screen.getByText("Saved.")).toBeDefined());
    expect(profilePayload?.displayName).toBe("Head DM");
  });

  it("rejects a password change with a wrong current password", async () => {
    renderWithProviders(<AccountPage />);
    await vi.waitFor(() => expect(screen.getByText("Password")).toBeDefined());
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "wrong-pass" } });
    fireEvent.change(screen.getByLabelText("New password (12+ characters)"), { target: { value: "new-password-13" } });
    fireEvent.click(screen.getByText("Change password"));
    await vi.waitFor(() => expect(screen.getByText(/unauthenticated/i)).toBeDefined());
  });

  it("changes the password with the correct current password", async () => {
    renderWithProviders(<AccountPage />);
    await vi.waitFor(() => expect(screen.getByText("Password")).toBeDefined());
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "correct-horse-12" } });
    fireEvent.change(screen.getByLabelText("New password (12+ characters)"), { target: { value: "new-password-13" } });
    fireEvent.click(screen.getByText("Change password"));
    await vi.waitFor(() => expect(screen.getByText("Password changed.")).toBeDefined());
  });
});

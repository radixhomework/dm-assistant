import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminDeleteUser,
  adminResetPassword,
  changeMyPassword,
  logout,
  updateProfile,
} from "./auth.js";
import { queryClient } from "../query-client.js";

function mockApi(handler: (input: string, init?: RequestInit) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) =>
      handler(input, init) as Response,
    ),
  );
}

describe("auth api helpers", () => {
  beforeEach(() => {
    queryClient.setQueryData(["me"], { id: "1", email: "a@b.c" });
  });

  afterEach(() => {
    queryClient.setQueryData(["me"], null);
    vi.unstubAllGlobals();
  });

  it("patches the profile and returns the updated user", async () => {
    mockApi(() => ({
      ok: true,
      json: async () => ({ id: "1", email: "n@b.c", displayName: "N", role: "dm", uiLocale: "fr" }),
    }));
    const updated = (await updateProfile({ email: "n@b.c", uiLocale: "fr" }))!;
    expect(updated.uiLocale).toBe("fr");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ email: "n@b.c", uiLocale: "fr" });
  });

  it("posts the password change with current and new passwords", async () => {
    mockApi(() => ({ ok: true, status: 204 }));
    await changeMyPassword("current-1", "new-password-13");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ currentPassword: "current-1", newPassword: "new-password-13" });
  });

  it("posts an admin password reset to the user's password route", async () => {
    mockApi(() => ({ ok: true, status: 204 }));
    await adminResetPassword("u9", "reset-pass-12");
    const [path, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/admin/users/u9/password");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ newPassword: "reset-pass-12" });
  });

  it("sends DELETE for an admin user removal", async () => {
    mockApi(() => ({ ok: true, status: 204 }));
    await adminDeleteUser("u9");
    const [path, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/admin/users/u9");
    expect(init.method).toBe("DELETE");
  });

  it("clears the cached auth state on logout", async () => {
    mockApi(() => ({ ok: true, status: 204 }));
    expect(queryClient.getQueryData(["me"])).not.toBeNull();
    await logout();
    expect(queryClient.getQueryData(["me"])).toBeNull();
    const [path, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/auth/logout");
    expect(init.method).toBe("POST");
  });

  it("clears the cached auth state even when the logout call fails", async () => {
    mockApi(() => {
      throw new Error("network down");
    });
    await logout();
    expect(queryClient.getQueryData(["me"])).toBeNull();
  });
});

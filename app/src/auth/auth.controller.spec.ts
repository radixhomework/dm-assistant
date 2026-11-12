import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthController, BootstrapController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";

function makeSettings(): vi.Mocked<SettingsService> {
  return {
    getAll: vi.fn(async () => ({ worldName: "Fraëweld", distanceUnit: "m", weightUnit: "kg", volumeUnit: "L" })),
    update: vi.fn(),
  } as unknown as vi.Mocked<SettingsService>;
}

function makeService(): vi.Mocked<AuthService> {
  return {
    login: vi.fn(async () => ({ id: "1", username: "a", email: "a@b.com", role: "admin" })),
    adminExists: vi.fn(async () => false),
    bootstrapInstance: vi.fn(async () => ({ email: "a@b.com" })),
  } as unknown as vi.Mocked<AuthService>;
}

describe("AuthController", () => {
  let service: vi.Mocked<AuthService>;
  let controller: AuthController;
  let request: { session: { userId?: string } };

  beforeEach(() => {
    service = makeService();
    controller = new AuthController(service);
    request = { session: {} };
  });

  it("parses the login payload and delegates to the service", async () => {
    const result = await controller.login(request, {
      username: "ab",
      password: "secret",
    });
    expect(result.email).toBe("a@b.com");
    expect(service.login).toHaveBeenCalledWith("ab", "secret", request.session);
  });

  it("returns the authenticated user", () => {
    const user = { id: "1", email: "a@b.com", displayName: "DM", role: "admin" };
    const request2 = { user } as never;
    expect(controller.me(request2)).toBe(user);
  });

  it("parses and delegates profile updates", async () => {
    service.updateProfile = vi.fn(async () => ({ id: "1", email: "n@b.com", displayName: "D", role: "dm", uiLocale: "fr", status: "active" }));
    const request2 = { user: { id: "u1" } } as never;
    await controller.updateProfile(request2, { uiLocale: "fr" });
    expect(service.updateProfile).toHaveBeenCalledWith("u1", { uiLocale: "fr" });
  });

  it("parses and delegates password changes", async () => {
    service.changePassword = vi.fn(async () => undefined);
    const request2 = { user: { id: "u1" } } as never;
    await controller.changePassword(request2, { currentPassword: "c", newPassword: "n-passphrase-12" });
    expect(service.changePassword).toHaveBeenCalledWith("u1", "c", "n-passphrase-12");
  });
});

describe("BootstrapController", () => {
  let service: vi.Mocked<AuthService>;
  let settings: vi.Mocked<SettingsService>;
  let controller: BootstrapController;

  beforeEach(() => {
    service = makeService();
    settings = makeSettings();
    controller = new BootstrapController(service, settings);
  });

  it("reports the bootstrap state with the world name", async () => {
    await expect(controller.state()).resolves.toEqual({
      adminExists: false,
      worldName: "Fraëweld",
    });
  });

  it("delegates the wizard payload", async () => {
    await controller.bootstrap({
      username: "admin",
      password: "a-long-enough-passphrase",
      displayName: "The DM",
      worldName: "My World",
    });
    expect(service.bootstrapInstance).toHaveBeenCalledWith(
      expect.objectContaining({ worldName: "My World" }),
    );
  });
});

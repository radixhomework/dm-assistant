import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthController, BootstrapController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";

function makeService(): vi.Mocked<AuthService> {
  return {
    login: vi.fn(async () => ({ id: "1", email: "a@b.com", role: "admin" })),
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
      email: "a@b.com",
      password: "secret",
    });
    expect(result.email).toBe("a@b.com");
    expect(service.login).toHaveBeenCalledWith("a@b.com", "secret", request.session);
  });

  it("returns the authenticated user", () => {
    const user = { id: "1", email: "a@b.com", displayName: "DM", role: "admin" };
    const request2 = { user } as never;
    expect(controller.me(request2)).toBe(user);
  });
});

describe("BootstrapController", () => {
  let service: vi.Mocked<AuthService>;
  let controller: BootstrapController;

  beforeEach(() => {
    service = makeService();
    controller = new BootstrapController(service);
  });

  it("reports the bootstrap state", async () => {
    await expect(controller.state()).resolves.toEqual({ adminExists: false });
  });

  it("delegates the wizard payload", async () => {
    await controller.bootstrap({
      email: "a@b.com",
      password: "a-long-enough-passphrase",
      displayName: "The DM",
      worldName: "My World",
    });
    expect(service.bootstrapInstance).toHaveBeenCalledWith(
      expect.objectContaining({ worldName: "My World" }),
    );
  });
});

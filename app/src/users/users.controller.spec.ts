import { beforeEach, describe, expect, it, vi } from "vitest";
import { UsersController } from "./users.controller.js";
import type { UsersService } from "./users.service.js";

function makeService(): vi.Mocked<UsersService> {
  return {
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({
      id: "1",
      email: "new@example.com",
      displayName: "New",
      role: "dm",
      status: "active",
    })),
    setStatus: vi.fn(async () => null),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    verifyPassword: vi.fn(),
  } as unknown as vi.Mocked<UsersService>;
}

describe("UsersController", () => {
  let service: vi.Mocked<UsersService>;
  let controller: UsersController;

  beforeEach(() => {
    service = makeService();
    controller = new UsersController(service);
  });

  it("lists users", async () => {
    await controller.list();
    expect(service.list).toHaveBeenCalled();
  });

  it("creates a user through the schema", async () => {
    await controller.create({
      username: "new",
      email: "new@example.com",
      password: "a-long-enough-passphrase",
      displayName: "New",
    });
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@example.com", role: "dm" }),
    );
  });

  it("maps the status patch", async () => {
    await controller.setStatus("u1", { status: "blocked" });
    expect(service.setStatus).toHaveBeenCalledWith("u1", "blocked");
    await controller.setStatus("u1", { status: "anything" });
    expect(service.setStatus).toHaveBeenLastCalledWith("u1", "active");
  });
});

import { Reflector } from "@nestjs/core";
import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGuard, type AuthedRequest } from "./auth.guard.js";
import type { SafeUser, UsersService } from "../users/users.service.js";

function requestWith(userId?: string): AuthedRequest {
  return { session: userId ? { userId } : {} } as AuthedRequest;
}

function contextWith(request: AuthedRequest) {
  return {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe("AuthGuard", () => {
  let usersService: { findById: ReturnType<typeof vi.fn> };
  let admin: SafeUser;

  beforeEach(() => {
    usersService = {
      safeOf: vi.fn((row: SafeUser) => row),
      findById: vi.fn(async (id: string) => {
        if (id === "admin-id") return admin;
        return null;
      }),
    };
    admin = {
      id: "admin-id",
      email: "a@b.c",
      displayName: "DM",
      role: "admin",
      status: "active",
    };
  });

  function makeGuard(isPublic: boolean): AuthGuard {
    const reflector = {
      getAllAndOverride: vi.fn(() => isPublic),
    } as unknown as Reflector;
    return new AuthGuard(reflector, usersService as unknown as UsersService);
  }

  it("allows @Public routes without a session", async () => {
    await expect(
      makeGuard(true).canActivate(contextWith(requestWith())),
    ).resolves.toBe(true);
  });

  it("loads the user for an authenticated session", async () => {
    const request = requestWith("admin-id");
    await expect(
      makeGuard(false).canActivate(contextWith(request)),
    ).resolves.toBe(true);
    expect(request.user?.email).toBe("a@b.c");
  });

  it("rejects a request without a session", async () => {
    await expect(
      makeGuard(false).canActivate(contextWith(requestWith())),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a session whose user vanished", async () => {
    await expect(
      makeGuard(false).canActivate(contextWith(requestWith("ghost-id"))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a blocked user", async () => {
    admin.status = "blocked";
    await expect(
      makeGuard(false).canActivate(contextWith(requestWith("admin-id"))),
    ).rejects.toThrow(UnauthorizedException);
    admin.status = "active";
  });
});

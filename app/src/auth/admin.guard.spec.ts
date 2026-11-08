import { describe, expect, it } from "vitest";
import { AdminGuard } from "./admin.guard.js";

function contextWith(user: { role?: string } | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

describe("AdminGuard", () => {
  const guard = new AdminGuard();

  it("allows an admin account", () => {
    expect(guard.canActivate(contextWith({ role: "admin" }))).toBe(true);
  });

  it("denies a dm account", () => {
    expect(() => guard.canActivate(contextWith({ role: "dm" }))).toThrow(
      /Administrator role required/,
    );
  });

  it("denies an anonymous request", () => {
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      /Administrator role required/,
    );
  });
});

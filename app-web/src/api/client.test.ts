import { afterEach, describe, expect, it, vi } from "vitest";
import { api, UnauthorizedError } from "./client.js";
import { fetchMe } from "./auth.js";

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses JSON bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ hello: "world" }),
    })));
    expect(await api("/api/x")).toEqual({ hello: "world" });
  });

  it("returns undefined for an empty body (void endpoints)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    })));
    expect(await api("/api/x", { method: "POST" })).toBeUndefined();
  });

  it("throws UnauthorizedError on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401 })));
    await expect(api("/api/x")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws the server message on other errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ message: "Slug 'x' already exists" }),
    })));
    await expect(api("/api/x")).rejects.toThrow(/already exists/);
  });
});

describe("fetchMe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a 401 to a null user", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401 })));
    expect(await fetchMe()).toBeNull();
  });

  it("returns the user on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin", uiLocale: null }),
    })));
    const user = await fetchMe();
    expect(user?.displayName).toBe("DM");
  });
});

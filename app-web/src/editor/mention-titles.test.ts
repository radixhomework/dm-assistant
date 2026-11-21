import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTitleCache, resolveTitle } from "./mention-titles.js";

describe("resolveTitle", () => {
  beforeEach(() => {
    clearTitleCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves the record title through the API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ slug: "osgwirond", title: "Osgwirond" }),
    })));
    expect(await resolveTitle("osgwirond")).toBe("Osgwirond");
    const [path] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(path).toBe("/api/records/osgwirond");
  });

  it("serves repeated lookups from the cache (single request)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ slug: "osgwirond", title: "Osgwirond" }),
    })));
    await resolveTitle("osgwirond");
    await resolveTitle("osgwirond");
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("resolves null for a dead target (404)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: "not found" }),
    })));
    expect(await resolveTitle("vanished")).toBeNull();
  });

  it("shares the in-flight request between concurrent lookups", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ slug: "osgwirond", title: "Osgwirond" }),
    })));
    const [first, second] = await Promise.all([resolveTitle("osgwirond"), resolveTitle("osgwirond")]);
    expect(first).toBe("Osgwirond");
    expect(second).toBe("Osgwirond");
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});

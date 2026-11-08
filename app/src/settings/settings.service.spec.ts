import { beforeAll, describe, expect, it } from "vitest";
import { resetTables, testDb } from "../testing/test-db.js";
import { settings } from "../database/schema.js";
import { SettingsService } from "./settings.service.js";

describe("SettingsService", () => {
  const service = new SettingsService(testDb);

  beforeAll(resetTables);

  it("returns null-valued content settings and default units on a fresh instance", async () => {
    const all = await service.getAll();
    expect(all.contentLanguage).toBeNull();
    expect(all.worldName).toBeNull();
    // Closed unit lists: a fresh or invalid value falls back to the first
    // entry of each list.
    expect(all.distanceUnit).toBe("m");
    expect(all.weightUnit).toBe("kg");
    expect(all.volumeUnit).toBe("L");
  });

  it("updates settings partially and camelCases the keys", async () => {
    const updated = await service.update({
      contentLanguage: "fr",
      distanceUnit: "ft",
    });
    expect(updated.contentLanguage).toBe("fr");
    expect(updated.distanceUnit).toBe("ft");
    expect(updated.weightUnit).toBe("kg");
    expect(updated.volumeUnit).toBe("L");
  });

  it("overwrites existing keys on a later update", async () => {
    await service.update({ weightUnit: "kg" });
    const updated = await service.update({ weightUnit: "lb" });
    expect(updated.weightUnit).toBe("lb");
  });

  it("falls back to the list's first value for invalid stored units", async () => {
    await testDb
      .insert(settings)
      .values({ key: "distance_unit", value: "miles" })
      .onConflictDoUpdate({ target: settings.key, set: { value: "miles" } });
    const all = await service.getAll();
    expect(all.distanceUnit).toBe("m");
  });
});

import { beforeAll, describe, expect, it } from "vitest";
import { resetTables, testDb } from "../testing/test-db.js";
import { SettingsService } from "./settings.service.js";

describe("SettingsService", () => {
  const service = new SettingsService(testDb);

  beforeAll(resetTables);


  it("returns null-valued settings on a fresh instance", async () => {
    const all = await service.getAll();
    expect(all.contentLanguage).toBeNull();
    expect(all.worldName).toBeNull();
  });

  it("updates settings partially and camelCases the keys", async () => {
    const updated = await service.update({
      contentLanguage: "fr",
      distanceUnit: "m",
    });
    expect(updated.contentLanguage).toBe("fr");
    expect(updated.distanceUnit).toBe("m");
    expect(updated.weightUnit).toBeNull();
  });

  it("overwrites existing keys on a later update", async () => {
    await service.update({ weightUnit: "kg" });
    const updated = await service.update({ weightUnit: "lb" });
    expect(updated.weightUnit).toBe("lb");
  });
});

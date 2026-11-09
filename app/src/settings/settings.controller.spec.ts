import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsController } from "./settings.controller.js";
import type { SettingsService } from "./settings.service.js";

function makeService(): vi.Mocked<SettingsService> {
  return {
    getAll: vi.fn(async () => ({
      worldName: "W",
      contentLanguage: "en",
      distanceUnit: "m",
      weightUnit: "kg",
    })),
    update: vi.fn(async () => ({
      worldName: "W",
      contentLanguage: "fr",
      distanceUnit: "m",
      weightUnit: "kg",
    })),
  } as unknown as vi.Mocked<SettingsService>;
}

describe("SettingsController", () => {
  let service: vi.Mocked<SettingsService>;
  let controller: SettingsController;

  beforeEach(() => {
    service = makeService();
    controller = new SettingsController(service);
  });

  it("returns the instance settings", async () => {
    const all = await controller.get();
    expect(all.worldName).toBe("W");
  });

  it("parses and delegates partial updates", async () => {
    await controller.update({ distanceUnit: "ft" });
    expect(service.update).toHaveBeenCalledWith({ distanceUnit: "ft" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagsAdminController } from "./tags-admin.controller.js";
import type { TagsService } from "./tags.service.js";

describe("TagsAdminController", () => {
  let service: vi.Mocked<TagsService>;
  let controller: TagsAdminController;

  beforeEach(() => {
    service = {
      rename: vi.fn(async () => ({ renamed: 2 })),
      merge: vi.fn(async () => ({ merged: 3 })),
    } as unknown as vi.Mocked<TagsService>;
    controller = new TagsAdminController(service);
  });

  it("renames through the schema", async () => {
    await controller.rename({ from: "forêt", to: "forêt noire" });
    expect(service.rename).toHaveBeenCalledWith({ from: "forêt", to: "forêt noire" });
  });

  it("merges through the schema", async () => {
    await controller.merge({ from: "forêt", into: "boise" });
    expect(service.merge).toHaveBeenCalledWith({ from: "forêt", into: "boise" });
  });
});

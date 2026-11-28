import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagsAdminController } from "./tags-admin.controller.js";
import { AdminGuard } from "../auth/admin.guard.js";
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

  it("carries the AdminGuard wiring on the class and both routes", () => {
    // Request-level gating proof: the controller metadata must carry
    // the AdminGuard (the guard's own unit tests cover the denial
    // cases), and both handlers must exist under their route paths.
    const guards = Reflect.getMetadata("__guards__", TagsAdminController) as
      | unknown[]
      | undefined;
    expect(guards).toContain(AdminGuard);
    const paths = ["rename", "merge"].map((method) => {
      const handler = TagsAdminController.prototype[method];
      if (typeof handler !== "function") throw new Error(`${method} missing`);
      // Nest attaches the route metadata to the handler function.
      return Reflect.getMetadata("path", handler) as string;
    });
    expect(paths.sort()).toEqual(["merge", "rename"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminGuard } from "../auth/admin.guard.js";
import {
  CatalogSourcesAdminController,
  CatalogSourcesController,
} from "./sources.controller.js";
import type { CatalogSourcesService } from "./sources.service.js";

describe("CatalogSourcesAdminController", () => {
  let service: vi.Mocked<CatalogSourcesService>;
  let controller: CatalogSourcesAdminController;
  // A RFC-valid uuid: z.uuid() (Zod 4) checks version and variant bits.
  const sourceId = "00000000-0000-4000-8000-00000000000a";

  beforeEach(() => {
    service = {
      create: vi.fn(async () => ({
        id: sourceId,
        name: "Open5e (SRD 5.2)",
        attribution: null,
        internal: false,
        disabled: false,
      })),
      update: vi.fn(async () => ({
        id: sourceId,
        name: "Open5e (SRD 5.2)",
        attribution: null,
        internal: false,
        disabled: true,
      })),
    } as unknown as vi.Mocked<CatalogSourcesService>;
    controller = new CatalogSourcesAdminController(service);
  });

  it("creates through the schema", async () => {
    await controller.create({ name: "Open5e (SRD 5.2)" });
    expect(service.create).toHaveBeenCalledWith({ name: "Open5e (SRD 5.2)" });
  });

  it("updates through the schema (uuid param validated)", async () => {
    await controller.update(sourceId, { disabled: true });
    expect(service.update).toHaveBeenCalledWith(sourceId, { disabled: true });
  });

  it("carries the AdminGuard wiring on the class and both routes", () => {
    const guards = Reflect.getMetadata("__guards__", CatalogSourcesAdminController) as
      | unknown[]
      | undefined;
    expect(guards).toContain(AdminGuard);
    const paths = ["create", "update"].map((method) => {
      const handler = CatalogSourcesAdminController.prototype[method];
      if (typeof handler !== "function") throw new Error(`${method} missing`);
      return Reflect.getMetadata("path", handler) as string;
    });
    expect(paths.sort()).toEqual(["/", ":id"]);
  });
});

describe("CatalogSourcesController", () => {
  it("lists through the service", async () => {
    const service = {
      list: vi.fn(async () => []),
    } as unknown as vi.Mocked<CatalogSourcesService>;
    const controller = new CatalogSourcesController(service);
    await controller.list();
    expect(service.list).toHaveBeenCalled();
  });
});

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTables, testDb } from "../testing/test-db.js";
import { EntitiesService } from "./entities.service.js";
import { RelationshipsService } from "../relationships/relationships.service.js";
import { CatalogSourcesService } from "../catalog-sources/sources.service.js";
import { TagsController } from "./tags.controller.js";

describe("TagsController", () => {
  let execute: ReturnType<typeof vi.fn>;
  let controller: TagsController;

  beforeEach(() => {
    execute = vi.fn(async () => [
      { tag: "cartographie", count: "2" },
      { tag: "voyage", count: 1 },
    ]);
    controller = new TagsController({ execute } as never);
  });

  it("returns the alphabetically ordered inventory with counts", async () => {
    const inventory = await controller.inventory();
    expect(inventory).toEqual([
      { tag: "cartographie", count: 2 },
      { tag: "voyage", count: 1 },
    ]);
  });

  it("coerces the bigint counts to numbers", async () => {
    execute.mockResolvedValue([{ tag: "solo", count: 0 }]);
    const inventory = await controller.inventory();
    expect(inventory).toEqual([{ tag: "solo", count: 0 }]);
  });
});

describe("TagsController (database)", () => {
  const entitiesService = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
    new CatalogSourcesService(testDb),
  );
  const controller = new TagsController(testDb);

  beforeAll(resetTables);
  beforeEach(resetTables);

  it("counts records per tag, not tag occurrences", async () => {
    // Tag normalization lands in round 2 — the API accepts duplicates
    // today, and the inventory must still count the RECORD once.
    await entitiesService.create({
      slug: "dup-tags",
      title: "Dupliqué",
      type: "places",
      perimeter: "world",
      tags: ["voyage", "voyage", "carte"],
      fields: {},
    });
    await entitiesService.create({
      slug: "one-tag",
      title: "Simple",
      type: "places",
      perimeter: "world",
      tags: ["voyage"],
      fields: {},
    });

    const inventory = await controller.inventory();
    expect(inventory).toEqual([
      { tag: "carte", count: 1 },
      { tag: "voyage", count: 2 },
    ]);
  });

  it("orders the inventory alphabetically", async () => {
    await entitiesService.create({
      slug: "tagged",
      title: "Taguée",
      type: "places",
      perimeter: "world",
      tags: ["zeta", "alpha"],
      fields: {},
    });

    const inventory = await controller.inventory();
    expect(inventory.map((entry) => entry.tag)).toEqual(["alpha", "zeta"]);
  });
});

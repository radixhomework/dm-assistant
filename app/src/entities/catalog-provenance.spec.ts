import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import {
  resetTables,
  seedInternalSource,
  testDb,
} from "../testing/test-db.js";
import { CatalogSourcesService } from "../catalog-sources/sources.service.js";
import { RelationshipsService } from "../relationships/relationships.service.js";
import { EntitiesController } from "./entities.controller.js";
import { EntitiesService } from "./entities.service.js";

/**
 * Simulates an import binding: the service's UI path binds Internal;
 * only the import binds external sources, so the specs rebind the row
 * directly to the named external source.
 */
async function rebindExternal(slug: string, sourceName: string): Promise<void> {
  await testDb.execute(sql`
    UPDATE entities
    SET source_id = (SELECT id FROM catalog_sources WHERE name = ${sourceName})
    WHERE slug = ${slug}
  `);
}

describe("Catalog provenance (srd-catalog-import)", () => {
  const sources = new CatalogSourcesService(testDb);
  const service = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
    sources,
  );

  beforeAll(resetTables);
  beforeEach(async () => {
    await resetTables();
    await seedInternalSource();
    await sources.create({ name: "Open5e (SRD 5.2)" });
  });

  it("binds the Internal source at catalog creation", async () => {
    const internal = (await sources.list()).find((s) => s.internal)!;
    const record = await service.create({
      slug: "blinded",
      title: "Blinded",
      type: "conditions",
      perimeter: "world",
      fields: {},
    });
    expect(record.sourceId).toBe(internal.id);

    const creature = await service.create({
      slug: "north-realm",
      title: "North realm",
      type: "places",
      perimeter: "world",
      fields: {},
    });
    expect(creature.sourceId).toBeNull();
  });

  it("carries the source view on the provenance read", async () => {
    const record = await service.create({
      slug: "blinded",
      title: "Blinded",
      type: "conditions",
      perimeter: "world",
      fields: {},
    });
    const view = await sources.viewOf(record.sourceId);
    expect(view).toMatchObject({ internal: true });
    expect((await sources.viewOf(null))).toBeNull();

    const external = (await sources.list()).find((s) => !s.internal)!;
    expect(await sources.viewOf(external.id)).toMatchObject({
      name: "Open5e (SRD 5.2)",
      internal: false,
    });
  });

  it("keeps the source immutable across updates", async () => {
    const internal = (await sources.list()).find((s) => s.internal)!;
    const record = await service.create({
      slug: "blinded",
      title: "Blinded",
      type: "conditions",
      perimeter: "world",
      fields: {},
    });
    await service.update("blinded", {
      title: "Blinded (renamed)",
      tags: ["état"],
      fields: { public_description: "You cannot see." },
    });
    const updated = await service.getBySlug("blinded");
    expect(updated.sourceId).toBe(internal.id);
    expect(updated.sourceId).toBe(record.sourceId);
  });

  it("refuses source-derived field updates on an imported record", async () => {
    await service.create({
      slug: "blinded",
      title: "Blinded",
      type: "conditions",
      perimeter: "world",
      fields: { public_description: "You cannot see." },
    });
    await rebindExternal("blinded", "Open5e (SRD 5.2)");

    await expect(
      service.update("blinded", {
        fields: { public_description: "Changed" },
      }),
    ).rejects.toMatchObject({ response: { code: "source_readonly" } });
    await expect(
      service.update("blinded", { title: "New title" }),
    ).rejects.toMatchObject({ response: { code: "source_readonly" } });
    // A new field key the dataset never carried is also source-derived.
    await expect(
      service.update("blinded", { fields: { commerce: "invented" } }),
    ).rejects.toMatchObject({ response: { code: "source_readonly" } });
    // The stored values are unchanged.
    const record = await service.getBySlug("blinded");
    expect(record.title).toBe("Blinded");
    expect(record.fields).toMatchObject({ public_description: "You cannot see." });
  });

  it("keeps DM-authored fields editable on an imported record", async () => {
    await service.create({
      slug: "blinded",
      title: "Blinded",
      type: "conditions",
      perimeter: "world",
      fields: { public_description: "You cannot see." },
    });
    await rebindExternal("blinded", "Open5e (SRD 5.2)");

    const updated = await service.update("blinded", {
      fields: {
        pitch: "The DM's hook.",
        private_description: "Private note.",
        public_description: "You cannot see.",
      },
    });
    expect(updated.fields).toMatchObject({
      pitch: "The DM's hook.",
      private_description: "Private note.",
      public_description: "You cannot see.",
    });
  });

  it("refuses tag changes on an imported record but accepts a no-op write", async () => {
    await service.create({
      slug: "blinded",
      title: "Blinded",
      type: "conditions",
      perimeter: "world",
      tags: ["état"],
      fields: {},
    });
    await rebindExternal("blinded", "Open5e (SRD 5.2)");

    await expect(
      service.update("blinded", { tags: ["nouveau"] }),
    ).rejects.toMatchObject({ response: { code: "source_readonly" } });
    // A form carrying the stored values back changes nothing: accepted.
    await service.update("blinded", { tags: ["État"] });
    await service.update("blinded", { title: "Blinded" });
    expect((await service.getBySlug("blinded")).tags).toEqual(["état"]);
  });

  it("refuses deletion of an imported record", async () => {
    await service.create({
      slug: "blinded",
      title: "Blinded",
      type: "conditions",
      perimeter: "world",
      fields: {},
    });
    await rebindExternal("blinded", "Open5e (SRD 5.2)");
    await expect(service.delete("blinded")).rejects.toMatchObject({
      response: { code: "source_readonly" },
    });
    expect(await service.getBySlug("blinded")).toMatchObject({ slug: "blinded" });
  });

  it("keeps an Internal catalog record fully editable and deletable", async () => {
    await service.create({
      slug: "homebrew",
      title: "Homebrew condition",
      type: "conditions",
      perimeter: "world",
      fields: { public_description: "Draft." },
    });
    await service.update("homebrew", {
      title: "Homebrew condition (v2)",
      tags: ["maison"],
      fields: { public_description: "Changed." },
    });
    const record = await service.getBySlug("homebrew");
    expect(record.title).toBe("Homebrew condition (v2)");
    expect(record.fields).toMatchObject({ public_description: "Changed." });
    await service.delete("homebrew");
    await expect(service.getBySlug("homebrew")).rejects.toThrow(/not found/);
  });
});

describe("EntitiesController provenance refusal", () => {
  it("refuses a client-declared source on create and update", async () => {
    const entitiesService = { create: vi.fn(), update: vi.fn() };
    const controller = new EntitiesController(
      entitiesService as unknown as EntitiesService,
      {} as RelationshipsService,
      {} as CatalogSourcesService,
    );
    const req = { user: { id: "user-1" } } as never;
    // The guard throws synchronously before any schema parsing — wrap
    // the call so the rejection reaches the matcher.
    await expect(
      async () =>
        controller.create(req, {
          slug: "x",
          type: "conditions",
          perimeter: "world",
          title: "X",
          sourceId: "evil",
        }),
    ).rejects.toMatchObject({ response: { code: "source_not_allowed" } });
    expect(entitiesService.create).not.toHaveBeenCalled();
    await expect(
      async () => controller.update("x", { title: "Y", sourceId: "evil" }),
    ).rejects.toMatchObject({ response: { code: "source_not_allowed" } });
    expect(entitiesService.update).not.toHaveBeenCalled();
  });
});

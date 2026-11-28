import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  resetTables,
  seedInternalSource,
  testDb,
} from "../testing/test-db.js";
import { CatalogSourcesService } from "./sources.service.js";

describe("CatalogSourcesService (database)", () => {
  const sources = new CatalogSourcesService(testDb);

  beforeAll(resetTables);
  beforeEach(async () => {
    await resetTables();
    await seedInternalSource();
  });
  // Specs share the database sequentially: leave the migration-seeded
  // state behind for the specs running after this file.
  afterAll(async () => {
    await resetTables();
    await seedInternalSource();
  });

  it("lists the Internal source first, then external sources alphabetically", async () => {
    await sources.create({ name: "Open5e (SRD 5.2)" });
    await sources.create({ name: "Ma source 2" });

    const listed = await sources.list();
    expect(listed.map((source) => source.name)).toEqual([
      "Internal",
      "Ma source 2",
      "Open5e (SRD 5.2)",
    ]);
    expect(listed[0]).toMatchObject({
      internal: true,
      disabled: false,
      attribution: null,
    });
  });

  it("creates a named external source with its attribution note", async () => {
    const created = await sources.create({
      name: "Open5e (SRD 5.2)",
      attribution: "Imported from api.open5e.com",
    });
    expect(created).toMatchObject({
      name: "Open5e (SRD 5.2)",
      attribution: "Imported from api.open5e.com",
      internal: false,
      disabled: false,
    });
    expect((await sources.list()).filter((source) => source.internal)).toHaveLength(1);
  });

  it("refuses a duplicate source name", async () => {
    await sources.create({ name: "Open5e (SRD 5.2)" });
    await expect(sources.create({ name: "Open5e (SRD 5.2)" })).rejects.toMatchObject({
      response: { code: "source_name_taken" },
    });
  });

  it("renames a source and rewrites its attribution note", async () => {
    const created = await sources.create({ name: "Old name" });
    const updated = await sources.update(created.id, {
      name: "New name",
      attribution: "updated",
    });
    expect(updated).toMatchObject({ name: "New name", attribution: "updated" });
    // The id is stable: provenance references never break on rename.
    expect((await sources.list()).map((source) => source.id)).toContain(created.id);
  });

  it("disables a source and re-enables it", async () => {
    const created = await sources.create({ name: "Open5e (SRD 5.2)" });
    const disabled = await sources.update(created.id, { disabled: true });
    expect(disabled.disabled).toBe(true);
    const enabled = await sources.update(created.id, { disabled: false });
    expect(enabled.disabled).toBe(false);
  });

  it("refuses every update on the built-in Internal source", async () => {
    const [internal] = (await sources.list()).filter((source) => source.internal);
    await expect(
      sources.update(internal.id, { name: "Renamed" }),
    ).rejects.toMatchObject({ response: { code: "source_immutable" } });
    await expect(
      sources.update(internal.id, { disabled: true }),
    ).rejects.toMatchObject({ response: { code: "source_immutable" } });
    await expect(
      sources.update(internal.id, { attribution: "nope" }),
    ).rejects.toMatchObject({ response: { code: "source_immutable" } });
  });

  it("refuses an unknown source id", async () => {
    await expect(
      sources.update("00000000-0000-0000-0000-000000000001", { name: "X" }),
    ).rejects.toThrow(/not found/);
  });

  it("keeps the disabled flag on existing records' provenance view", async () => {
    // Disabling only removes the source from import selection — the
    // source row (and so the badges of its records) stays intact.
    const created = await sources.create({ name: "Retired" });
    await sources.update(created.id, { disabled: true });
    const rows = await testDb.execute<{ name: string }>(
      sql`SELECT name FROM catalog_sources WHERE disabled_at IS NOT NULL`,
    );
    expect(rows.map((row) => row.name)).toEqual(["Retired"]);
  });
});

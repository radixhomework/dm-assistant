import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { catalogTypes } from "@dm/schemas";
import { testDb } from "../testing/test-db.js";

/**
 * Round-3 migration of the srd-catalog-import capability: the
 * `catalog_sources` registry (seeded with the built-in Internal source)
 * and the nullable `entities.source_id` provenance FK. CI proves the
 * SQL runs on a genuinely fresh database (db:migrate step); this spec
 * pins the seeded state and drift-guards the catalog-type list of the
 * backfill against the packages/schemas registry.
 */
describe("0010_catalog_sources migration", () => {
  it("seeds exactly one internal source named Internal", async () => {
    const rows = await testDb.execute<{ name: string; internal: boolean }>(
      sql`SELECT name, internal FROM catalog_sources`,
    );
    const internal = rows.filter((row) => row.internal);
    expect(internal).toHaveLength(1);
    expect(internal[0].name).toBe("Internal");
    expect(rows.filter((row) => !row.internal)).toHaveLength(0);
  });

  it("backfill catalog-type list mirrors the catalogTypes registry", () => {
    const migration = readFileSync(
      join(process.cwd(), "drizzle", "0010_catalog_sources.sql"),
      "utf8",
    );
    const update = migration.match(/UPDATE "entities"[\s\S]*$/)?.[0] ?? "";
    const listed = [...update.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...catalogTypes].sort());
  });
});

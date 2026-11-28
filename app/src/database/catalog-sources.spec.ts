import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { catalogTypes } from "@dm/schemas";
import { resetTables, testDb } from "../testing/test-db.js";

/**
 * Round-3 migration of the srd-catalog-import capability: the
 * `catalog_sources` registry (seeded with the built-in Internal source)
 * and the nullable `entities.source_id` provenance FK. CI proves the
 * SQL file runs on a genuinely fresh database (db:migrate step); this
 * spec replays the migration's data statements on a truncated schema —
 * the CREATE TABLE / ALTER have already been applied by db:migrate —
 * and pins their behavior, drift-guarding the catalog-type list of the
 * backfill against the packages/schemas registry.
 */
describe("0010_catalog_sources migration", () => {
  const migration = readFileSync(
    join(process.cwd(), "drizzle", "0010_catalog_sources.sql"),
    "utf8",
  );
  const statements = migration
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const seedStatement = statements.find((s) =>
    s.includes('INSERT INTO "catalog_sources"'),
  );
  const backfillStatement = statements.find((s) =>
    s.includes('UPDATE "entities" SET "source_id"'),
  );

  beforeAll(resetTables);
  beforeEach(resetTables);

  it("seeds exactly one internal source named Internal", async () => {
    await testDb.execute(sql.raw(seedStatement!));
    const rows = await testDb.execute<{ name: string; internal: boolean }>(
      sql`SELECT name, internal FROM catalog_sources`,
    );
    const internal = rows.filter((row) => row.internal);
    expect(internal).toHaveLength(1);
    expect(internal[0].name).toBe("Internal");
    expect(rows.filter((row) => !row.internal)).toHaveLength(0);
  });

  it("backfills catalog-type records to the Internal source", async () => {
    await testDb.execute(sql.raw(seedStatement!));
    // Pre-migration rows: a catalog record (DM-authored) and a
    // non-catalog one, both carrying no provenance.
    await testDb.execute(sql`
      INSERT INTO entities (slug, type, perimeter, title)
      VALUES ('blinded', 'conditions', 'world', 'Blinded'),
             ('north-realm', 'places', 'world', 'North realm')
    `);
    await testDb.execute(sql.raw(backfillStatement!));

    const bound = await testDb.execute<{ slug: string; internal: boolean | null }>(
      sql`
        SELECT e.slug, s.internal
        FROM entities e LEFT JOIN catalog_sources s ON s.id = e.source_id
      `,
    );
    expect(bound.find((row) => row.slug === "blinded")).toMatchObject({
      internal: true,
    });
    expect(bound.find((row) => row.slug === "north-realm")).toMatchObject({
      internal: null,
    });
  });

  it("backfill catalog-type list mirrors the catalogTypes registry", () => {
    const listed = [
      ...backfillStatement!.matchAll(/'([a-z0-9-]+)'/g),
    ].map((match) => match[1]);
    expect(listed.sort()).toEqual([...catalogTypes].sort());
  });
});

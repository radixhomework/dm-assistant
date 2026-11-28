import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  resetTables,
  seedInternalSource,
  testDb,
} from "../testing/test-db.js";
import { CatalogSourcesService } from "../catalog-sources/sources.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { ImportService } from "./import.service.js";

/** An Open5e v2-shaped element (SRD 2024 description entry). */
function element(key: string, name: string, desc: string) {
  return {
    key,
    name,
    descriptions: [{ desc, document: "srd-2024", gamesystem: "5e-2024" }],
  };
}

describe("ImportService (database)", () => {
  const sources = new CatalogSourcesService(testDb);
  const settings = new SettingsService(testDb);
  const importService = new ImportService(testDb, sources, settings);

  let externalId = "";
  let internalId = "";

  beforeAll(resetTables);
  beforeEach(async () => {
    await resetTables();
    await seedInternalSource();
    internalId = (await sources.list()).find((s) => s.internal)!.id;
    externalId = (await sources.create({ name: "Open5e (SRD 5.2)" })).id;
  });

  const catalog = "conditions" as const;
  const origin = () => ({ catalog, sourceId: externalId });

  it("previews new elements as new", async () => {
    const preview = await importService.preview(origin(), [
      element("blinded", "Blinded", "* You can't see."),
    ]);
    expect(preview.items).toEqual([
      { slug: "blinded", title: "Blinded", status: "new" },
    ]);
  });

  it("flags invalid elements with their reason, never blocking the run", async () => {
    const preview = await importService.preview(origin(), [
      element("blinded", "Blinded", "* You can't see."),
      { key: "broken" }, // no name at all
      "not-an-object",
    ]);
    expect(preview.items[0].status).toBe("new");
    expect(preview.items[1]).toMatchObject({
      slug: "broken",
      title: "",
      status: "skipped",
      reason: "invalid_element",
    });
    expect(preview.items[2]).toMatchObject({
      status: "skipped",
      reason: "invalid_element",
    });
  });

  it("marks same-source existing records as pre-checked overwrites", async () => {
    await importService.confirm(origin(), [
      element("blinded", "Blinded", "* You can't see."),
    ], []);
    const preview = await importService.preview(origin(), [
      element("blinded", "Blinded (updated)", "* Rewritten."),
    ]);
    expect(preview.items[0]).toMatchObject({
      status: "overwrite",
      preChecked: true,
      existingTitle: "Blinded",
      existingSourceName: "Open5e (SRD 5.2)",
    });
  });

  it("offers records of another provenance as unchecked conflicts", async () => {
    await importService.confirm(origin(), [
      element("blinded", "Blinded", "* You can't see."),
    ], []);
    // The DM later re-creates the record by hand: Internal provenance.
    await testDb.execute(
      sql`UPDATE entities SET source_id = ${internalId} WHERE slug = 'blinded'`,
    );
    const preview = await importService.preview(origin(), [
      element("blinded", "Blinded", "* Rewritten."),
    ]);
    expect(preview.items[0]).toMatchObject({
      status: "conflict",
      preChecked: false,
      existingTitle: "Blinded",
      existingSourceName: "Internal",
    });
  });

  it("skips a slug held by a record of another type", async () => {
    await testDb.execute(sql`
      INSERT INTO entities (slug, type, perimeter, title)
      VALUES ('blinded', 'places', 'world', 'A place holding the slug')
    `);
    const preview = await importService.preview(origin(), [
      element("blinded", "Blinded", "* You can't see."),
    ]);
    expect(preview.items[0]).toMatchObject({
      status: "skipped",
      reason: "slug_taken",
      existingTitle: "A place holding the slug",
    });
  });

  it("skips rows that provably belong to another document", async () => {
    // An unfiltered Open5e list mixes sources: rows carrying text only
    // for another document skip — importing them would mislabel
    // third-party content under the importing source.
    const preview = await importService.preview(origin(), [
      { key: "a5e-bloodied", name: "Bloodied", descriptions: [{ desc: "EN Publishing text.", document: "a5e-ag" }] },
    ]);
    expect(preview.items[0]).toMatchObject({
      status: "skipped",
      reason: "no_text_for_document",
    });
  });

  it("imports textless rows of the chosen document as shells", async () => {
    // SRD base classes carry no prose (documented through their
    // features): they import as description-less records. A row of
    // another document stays out.
    const report = await importService.confirm(origin(), [
      { key: "srd-2024_fighter", name: "Fighter", desc: "", document: { key: "srd-2024" } },
      { key: "a5e_gambling-general", name: "Gambling General", desc: "", document: { key: "a5e-ag" } },
    ], []);
    expect(report).toMatchObject({ created: 1 });
    expect(report.skipped).toEqual([
      { slug: "a5e_gambling-general", title: "Gambling General", reason: "no_text_for_document" },
    ]);
    const record = await testDb.execute<{ fields: Record<string, string> }>(
      sql`SELECT fields FROM entities WHERE slug = 'srd-2024_fighter'`,
    );
    expect(record[0].fields).toEqual({});
  });

  it("flags duplicate slugs inside one dataset", async () => {
    const preview = await importService.preview(origin(), [
      element("blinded", "Blinded", "* First."),
      element("blinded", "Blinded again", "* Second."),
    ]);
    expect(preview.items[0].status).toBe("new");
    expect(preview.items[1]).toMatchObject({
      status: "skipped",
      reason: "duplicate_in_dataset",
    });
  });

  it("creates imported records bound to the importing source", async () => {
    const report = await importService.confirm(origin(), [
      element("blinded", "Blinded", "* You can't see."),
      element("charmed", "Charmed", "* Charmed..."),
    ], []);
    expect(report).toMatchObject({ created: 2, updated: 0 });
    const record = await testDb.execute<{
      title: string;
      source_id: string;
      fields: { public_description: string };
    }>(sql`SELECT title, source_id, fields FROM entities WHERE slug = 'blinded'`);
    expect(record[0]).toMatchObject({
      title: "Blinded",
      source_id: externalId,
      fields: { public_description: "* You can't see." },
    });
  });

  it("refuses to run under the Internal source or a disabled source", async () => {
    await expect(
      importService.preview({ catalog, sourceId: internalId }, []),
    ).rejects.toMatchObject({ response: { code: "import_invalid_payload" } });
    await sources.update(externalId, { disabled: true });
    await expect(importService.preview(origin(), [])).rejects.toMatchObject({
      response: { code: "import_invalid_payload" },
    });
  });

  it("overwrites accepted same-source records, preserving DM-authored fields", async () => {
    await importService.confirm(origin(), [
      element("blinded", "Blinded", "* You can't see."),
    ], []);
    // The DM authored a Pitch and a private note on the imported record.
    await testDb.execute(sql`
      UPDATE entities
      SET fields = jsonb_set(fields, '{pitch}', '"The DM hook."')
      WHERE slug = 'blinded'
    `);

    const report = await importService.confirm(origin(), [
      element("blinded", "Blinded (v2)", "* Rewritten text."),
    ], ["blinded"]);
    expect(report).toMatchObject({ created: 0, updated: 1, skipped: [] });
    const rows = await testDb.execute<{
      title: string;
      source_id: string;
      fields: Record<string, string>;
    }>(sql`SELECT title, source_id, fields FROM entities WHERE slug = 'blinded'`);
    expect(rows[0].title).toBe("Blinded (v2)");
    expect(rows[0].source_id).toBe(externalId);
    expect(rows[0].fields["public_description"]).toBe("* Rewritten text.");
    expect(rows[0].fields["pitch"]).toBe("The DM hook.");
  });

  it("leaves an unaccepted overwrite untouched and reports it", async () => {
    await importService.confirm(origin(), [
      element("blinded", "Blinded", "* You can't see."),
    ], []);
    const report = await importService.confirm(origin(), [
      element("blinded", "Blinded (v2)", "* Rewritten text."),
    ], []);
    expect(report.updated).toBe(0);
    expect(report.skipped).toEqual([
      { slug: "blinded", title: "Blinded (v2)", reason: "not_accepted" },
    ]);
    const rows = await testDb.execute<{ title: string }>(
      sql`SELECT title FROM entities WHERE slug = 'blinded'`,
    );
    expect(rows[0].title).toBe("Blinded");
  });

  it("rebinds a confirmed cross-source overwrite and preserves DM fields", async () => {
    // An internal record the DM authored a Pitch on, imported over from
    // the external source: the DM confirms the conflict explicitly.
    await testDb.execute(sql`
      INSERT INTO entities (slug, type, perimeter, title, fields, source_id)
      VALUES ('blinded', 'conditions', 'world', 'Blinded',
              '{"pitch": "The DM hook.", "public_description": "DM version."}', ${internalId})
    `);

    const report = await importService.confirm(origin(), [
      element("blinded", "Blinded", "* SRD text."),
    ], ["blinded"]);
    expect(report).toMatchObject({ created: 0, updated: 1, skipped: [] });
    const rows = await testDb.execute<{
      source_id: string;
      fields: Record<string, string>;
    }>(sql`SELECT source_id, fields FROM entities WHERE slug = 'blinded'`);
    // The badge names the data's true origin; the DM-authored Pitch is
    // preserved while the source-derived description holds the dataset.
    expect(rows[0].source_id).toBe(externalId);
    expect(rows[0].fields["pitch"]).toBe("The DM hook.");
    expect(rows[0].fields["public_description"]).toBe("* SRD text.");
  });

  it("keeps the search vector consistent with the imported fields", async () => {
    await importService.confirm(origin(), [
      element("blinded", "Blinded", "* You cannot see anything."),
    ], []);
    const rows = await testDb.execute<{ search_vector: string }>(
      sql`SELECT search_vector::text AS search_vector FROM entities WHERE slug = 'blinded'`,
    );
    // The vector is lexeme text, not empty: the description was indexed.
    expect(rows[0].search_vector.length).toBeGreaterThan(0);
    expect(rows[0].search_vector).toContain("see");
  });
});

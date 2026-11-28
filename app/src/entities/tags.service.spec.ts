import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { resetTables, testDb } from "../testing/test-db.js";
import {
  EntitiesService,
  normalizeTags,
} from "./entities.service.js";
import { RelationshipsService } from "../relationships/relationships.service.js";
import { CatalogSourcesService } from "../catalog-sources/sources.service.js";
import { TagsService } from "./tags.service.js";

describe("normalizeTags (pure)", () => {
  it("trims, lowercases and collapses internal whitespace", () => {
    expect(normalizeTags(["  Forêt   Noire  "])).toEqual(["forêt noire"]);
  });

  it("deduplicates case-insensitively keeping the first occurrence", () => {
    expect(normalizeTags(["Forêt", "forêt", "VOYAGE"])).toEqual(["forêt", "voyage"]);
  });

  it("drops empty entries", () => {
    expect(normalizeTags(["", "   ", "ok"])).toEqual(["ok"]);
  });

  it("returns an empty array for no tags", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe("TagsService (database)", () => {
  // Tags are a set: the SQL rewrites do not guarantee stored order.
  const sorted = (tags: string[]) => [...tags].sort((a, b) => a.localeCompare(b, "fr"));
  const entitiesService = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
    new CatalogSourcesService(testDb),
  );
  const tagsService = new TagsService(testDb);

  beforeAll(resetTables);
  beforeEach(resetTables);

  async function createRecord(slug: string, tags: string[]) {
    return entitiesService.create({
      slug,
      title: slug,
      type: "places",
      perimeter: "world",
      tags,
      fields: {},
    });
  }

  it("renames a tag across every record carrying it", async () => {
    await createRecord("a", ["forêt"]);
    await createRecord("b", ["forêt", "voyage"]);
    await createRecord("c", ["voyage"]);

    const result = await tagsService.rename({ from: "Forêt", to: "Forêt noire" });
    expect(result).toEqual({ renamed: 2 });

    expect(sorted((await entitiesService.getBySlug("a")).tags)).toEqual(sorted(["forêt noire"]));
    expect(sorted((await entitiesService.getBySlug("b")).tags)).toEqual(sorted(["forêt noire", "voyage"]));
    expect(sorted((await entitiesService.getBySlug("c")).tags)).toEqual(sorted(["voyage"]));
  });

  it("rename deduplicates a record carrying both the old and the new tag", async () => {
    await createRecord("ab", ["forêt", "forêt noire"]);

    await tagsService.rename({ from: "forêt", to: "forêt noire" });
    expect(sorted((await entitiesService.getBySlug("ab")).tags)).toEqual(sorted(["forêt noire"]));
  });

  it("merge absorbs the tag into the target and deduplicates", async () => {
    await createRecord("a", ["forêt"]);
    await createRecord("b", ["forêt", "boise"]);
    await createRecord("c", ["boise"]);

    const result = await tagsService.merge({ from: "Forêt", into: "Boise" });
    expect(result).toEqual({ merged: 2 });

    expect(sorted((await entitiesService.getBySlug("a")).tags)).toEqual(sorted(["boise"]));
    expect(sorted((await entitiesService.getBySlug("b")).tags)).toEqual(sorted(["boise"]));
    expect(sorted((await entitiesService.getBySlug("c")).tags)).toEqual(sorted(["boise"]));
  });

  it("leaves records untouched when the tags are identical or unknown", async () => {
    await createRecord("a", ["forêt"]);

    expect(await tagsService.rename({ from: "forêt", to: "forêt" })).toEqual({ renamed: 0 });
    expect(await tagsService.merge({ from: "inconnu", into: "boise" })).toEqual({ merged: 0 });
    expect(sorted((await entitiesService.getBySlug("a")).tags)).toEqual(sorted(["forêt"]));
  });

  it("absorbs the only tag of a record on merge", async () => {
    // The record carries ONLY the absorbed tag: it comes out carrying
    // just the target (the SQL's coalesce guards the emptied-array NULL
    // defensively — the append always fills the array back in).
    await createRecord("solo", ["forêt"]);

    await tagsService.merge({ from: "forêt", into: "boise" });
    expect(sorted((await entitiesService.getBySlug("solo")).tags)).toEqual(sorted(["boise"]));
  });

  it("normalizes tags at creation and update", async () => {
    const record = await entitiesService.create({
      slug: "tagged",
      title: "Taguée",
      type: "places",
      perimeter: "world",
      tags: ["Forêt ", "forêt", "  ", "Voyage"],
      fields: {},
    });
    // The Forêt/forêt dedup case from the record-tags spec.
    expect(record.tags).toEqual(["forêt", "voyage"]);

    await entitiesService.update("tagged", { tags: ["  CARTES  ", "cartes"] });
    expect((await entitiesService.getBySlug("tagged")).tags).toEqual(["cartes"]);
  });

  it("rename and merge reach legacy rows holding non-normalized values", async () => {
    // A row written outside the service (a legacy row, a future import
    // bypass): the raw insert carries un-normalized tags.
    await testDb.execute(sql`
      INSERT INTO entities (slug, type, perimeter, title, tags, fields)
      VALUES ('legacy', 'places', 'world', 'Legacy', ARRAY['Forêt', '  Voyage  '], '{}')
    `);

    const renamed = await tagsService.rename({ from: "FORÊT", to: "forêt noire" });
    expect(renamed).toEqual({ renamed: 1 });
    const afterRename = (await entitiesService.getBySlug("legacy")).tags;
    // The matched value rewrote; the unrelated neighbor kept verbatim.
    expect(sorted(afterRename)).toEqual(["  Voyage  ", "forêt noire"]);

    const merged = await tagsService.merge({ from: "  forêt noire  ", into: "boise" });
    expect(merged).toEqual({ merged: 1 });
    const afterMerge = (await entitiesService.getBySlug("legacy")).tags;
    // '  Voyage  ' normalizes to 'voyage' ≠ 'boise': the target is
    // appended alongside it.
    expect(sorted(afterMerge)).toEqual(["  Voyage  ", "boise"]);
  });
});

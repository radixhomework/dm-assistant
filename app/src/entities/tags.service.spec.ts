import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetTables, testDb } from "../testing/test-db.js";
import {
  EntitiesService,
  normalizeTags,
} from "./entities.service.js";
import { RelationshipsService } from "../relationships/relationships.service.js";
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
  const entitiesService = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
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

    expect((await entitiesService.getBySlug("a")).tags).toEqual(["forêt noire"]);
    expect((await entitiesService.getBySlug("b")).tags).toEqual(["forêt noire", "voyage"]);
    expect((await entitiesService.getBySlug("c")).tags).toEqual(["voyage"]);
  });

  it("rename deduplicates a record carrying both the old and the new tag", async () => {
    await createRecord("ab", ["forêt", "forêt noire"]);

    await tagsService.rename({ from: "forêt", to: "forêt noire" });
    expect((await entitiesService.getBySlug("ab")).tags).toEqual(["forêt noire"]);
  });

  it("merge absorbs the tag into the target and deduplicates", async () => {
    await createRecord("a", ["forêt"]);
    await createRecord("b", ["forêt", "boise"]);
    await createRecord("c", ["boise"]);

    const result = await tagsService.merge({ from: "Forêt", into: "Boise" });
    expect(result).toEqual({ merged: 2 });

    expect((await entitiesService.getBySlug("a")).tags).toEqual(["boise"]);
    expect((await entitiesService.getBySlug("b")).tags).toEqual(["boise"]);
    expect((await entitiesService.getBySlug("c")).tags).toEqual(["boise"]);
  });

  it("leaves records untouched when the tags are identical or unknown", async () => {
    await createRecord("a", ["forêt"]);

    expect(await tagsService.rename({ from: "forêt", to: "forêt" })).toEqual({ renamed: 0 });
    expect(await tagsService.merge({ from: "inconnu", into: "boise" })).toEqual({ merged: 0 });
    expect((await entitiesService.getBySlug("a")).tags).toEqual(["forêt"]);
  });

  it("absorbs the only tag of a record on merge", async () => {
    // The record carries ONLY the absorbed tag: it comes out carrying
    // just the target (the SQL's coalesce guards the emptied-array NULL
    // defensively — the append always fills the array back in).
    await createRecord("solo", ["forêt"]);

    await tagsService.merge({ from: "forêt", into: "boise" });
    expect((await entitiesService.getBySlug("solo")).tags).toEqual(["boise"]);
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
});

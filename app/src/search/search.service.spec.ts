import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetTables, testDb } from "../testing/test-db.js";
import { EntitiesService } from "../entities/entities.service.js";
import { RelationshipsService } from "../relationships/relationships.service.js";
import { CatalogSourcesService } from "../catalog-sources/sources.service.js";
import { SearchService } from "./search.service.js";

describe("SearchService", () => {
  const entitiesService = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
    new CatalogSourcesService(testDb),
  );
  const searchService = new SearchService(testDb);

  beforeAll(resetTables);
  beforeEach(resetTables);

  async function createRecord(input: {
    slug: string;
    title: string;
    type: string;
    perimeter?: "world" | "campaign";
    tags?: string[];
    fields?: Record<string, unknown>;
  }) {
    return entitiesService.create({
      slug: input.slug,
      title: input.title,
      type: input.type,
      perimeter: input.perimeter ?? "world",
      tags: input.tags ?? [],
      fields: input.fields ?? {},
    });
  }

  it("matches a record from its prose fields, accent-insensitively", async () => {
    await createRecord({
      slug: "ecole-de-magie",
      title: "Académie des arcanes",
      type: "places",
      fields: {
        public_description: "La plus ancienne **école** de magie du royaume.",
      },
    });

    const hits = await searchService.search({ q: "ecole" });
    expect(hits.map((hit) => hit.slug)).toEqual(["ecole-de-magie"]);
  });

  it("matches a record from its title, accent-insensitively", async () => {
    await createRecord({
      slug: "ecole-de-magie",
      title: "École de magie",
      type: "places",
    });

    const hits = await searchService.search({ q: "ecole" });
    expect(hits.map((hit) => hit.slug)).toEqual(["ecole-de-magie"]);
  });

  it("matches titles in English content the same way", async () => {
    await createRecord({
      slug: "school-of-arcane",
      title: "School of Arcane Magic",
      type: "places",
    });

    const hits = await searchService.search({ q: "arcane" });
    expect(hits.map((hit) => hit.slug)).toEqual(["school-of-arcane"]);
  });

  it("does not match non-text field values", async () => {
    await createRecord({
      slug: "verrou-du-lac",
      title: "Verrou du lac",
      type: "places",
      fields: {
        // Enum and numeric-string values: searchable-looking text the
        // index must ignore (only text fields are indexed).
        place_type: "city",
        population: "12000",
      },
    });

    expect(await searchService.search({ q: "city" })).toEqual([]);
    expect(await searchService.search({ q: "12000" })).toEqual([]);
    expect((await searchService.search({ q: "verrou" })).map((h) => h.slug)).toEqual([
      "verrou-du-lac",
    ]);
  });

  it("ranks a title match above a fields-only match and returns snippets", async () => {
    await createRecord({
      slug: "gardons",
      title: "Les Gardons",
      type: "places",
    });
    await createRecord({
      slug: "riviere-a-gardons",
      title: "La rivière paisible",
      type: "places",
      fields: { public_description: "Elle regorge de gardons argentés." },
    });

    const hits = await searchService.search({ q: "gardons" });
    expect(hits.map((hit) => hit.slug)).toEqual(["gardons", "riviere-a-gardons"]);
    // The title-only record's headline comes from its document (title +
    // field text); the fields-only record's snippet marks the match.
    expect(hits[0].snippet).toContain("⟦");
    expect(hits[1].snippet).toContain("⟦gardons⟧");
  });

  it("keeps saved records searchable and removed text unfindable", async () => {
    await createRecord({
      slug: "foret-noire",
      title: "Forêt noire",
      type: "natural-landmarks",
      fields: { public_description: "Une forêt hantée par les loups." },
    });

    expect((await searchService.search({ q: "loups" })).map((h) => h.slug)).toEqual([
      "foret-noire",
    ]);

    await entitiesService.update("foret-noire", {
      fields: { public_description: "Une forêt silencieuse." },
    });
    expect(await searchService.search({ q: "loups" })).toEqual([]);
    expect((await searchService.search({ q: "silencieuse" })).map((h) => h.slug)).toEqual([
      "foret-noire",
    ]);

    await entitiesService.delete("foret-noire");
    expect(await searchService.search({ q: "silencieuse" })).toEqual([]);
  });

  it("combines type and tag filters", async () => {
    await createRecord({
      slug: "archipel-du-nord",
      title: "Archipel du Nord",
      type: "places",
      tags: ["voyage"],
      fields: { public_description: "Un archipel brumeux." },
    });
    await createRecord({
      slug: "carte-de-l-archipel",
      title: "Carte de l'archipel",
      type: "works",
      tags: ["cartographie"],
      fields: { public_description: "Une carte de l'archipel." },
    });

    const both = await searchService.search({ q: "archipel", type: "places", tag: "voyage" });
    expect(both.map((hit) => hit.slug)).toEqual(["archipel-du-nord"]);

    const wrongTag = await searchService.search({ q: "archipel", type: "places", tag: "cartographie" });
    expect(wrongTag).toEqual([]);
  });

  it("ranks a title match first when both records match the full query", async () => {
    await createRecord({
      slug: "silver-dragon-mountain",
      title: "Silver dragon mountain",
      type: "places",
    });
    await createRecord({
      slug: "quiet-cave",
      title: "Quiet cave",
      type: "places",
      fields: { public_description: "A cave etched with silver dragon motifs." },
    });

    const hits = await searchService.search({ q: "silver dragon" });
    // Both match the AND-composed query; the title match ranks first
    // explicitly, not by trusting ts_rank's multiword arithmetic.
    expect(hits.map((hit) => hit.slug)).toEqual([
      "silver-dragon-mountain",
      "quiet-cave",
    ]);
  });

  it("keeps partial-title ILIKE matches in the title-first group", async () => {
    // "Gardon" matches only through the ILIKE helper; the other record
    // matches full-text on its prose — the title match ranks first.
    await createRecord({
      slug: "gardon",
      title: "Gardon",
      type: "places",
    });
    await createRecord({
      slug: "tower-of-gar",
      title: "Tower",
      type: "places",
      fields: { public_description: "The gar lives beneath it." },
    });

    const hits = await searchService.search({ q: "gar" });
    expect(hits.map((hit) => hit.slug)).toEqual(["gardon", "tower-of-gar"]);
  });

  it("appends ILIKE-only partial title matches after vector matches", async () => {
    await createRecord({
      slug: "gardons-lac",
      title: "Gardons du lac",
      type: "places",
    });
    // "Lesgardons" holds the substring but not the token — the ILIKE
    // helper catches it, the vector does not (no prefix matching).
    await createRecord({
      slug: "lesgardons",
      title: "Lesgardons mystérieux",
      type: "places",
    });

    const hits = await searchService.search({ q: "gardons" });
    expect(hits.map((hit) => hit.slug)).toEqual(["gardons-lac", "lesgardons"]);
    expect(hits[0].snippet).toContain("⟦Gardons⟧");
    expect(hits[1].snippet).not.toContain("⟦");
  });

  it("answers an empty result for a query nothing matches", async () => {
    await createRecord({ slug: "ville", title: "Ville haute", type: "places" });
    expect(await searchService.search({ q: "zorglub" })).toEqual([]);
  });

  it("answers an empty result for a blank query", async () => {
    await createRecord({ slug: "ville", title: "Ville haute", type: "places" });
    expect(await searchService.search({ q: "   " })).toEqual([]);
  });
});

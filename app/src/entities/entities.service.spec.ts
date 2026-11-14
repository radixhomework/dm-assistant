import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetTables, testDb } from "../testing/test-db.js";
import { entities, mentions, users } from "../database/schema.js";
import { EntitiesService, foldStatuses, parseMentionSlugs } from "./entities.service.js";
import { RelationshipsService } from "../relationships/relationships.service.js";

describe("foldStatuses (pure)", () => {
  it("returns not played for no children", () => {
    expect(foldStatuses([])).toBe("not_played");
  });
  it("returns in progress when any child is in progress", () => {
    expect(foldStatuses(["played", "in_progress"])).toBe("in_progress");
    expect(foldStatuses(["in_progress", "not_played"])).toBe("in_progress");
  });
  it("returns in progress when a child is played (work started)", () => {
    expect(foldStatuses(["played", "not_played"])).toBe("in_progress");
    expect(foldStatuses(["played", "not_played", "not_played"])).toBe("in_progress");
  });
  it("returns played only when all children are played", () => {
    expect(foldStatuses(["played", "played"])).toBe("played");
    expect(foldStatuses(["played"])).toBe("played");
  });
  it("returns not played while every child is untouched", () => {
    expect(foldStatuses(["not_played", "not_played"])).toBe("not_played");
  });
});

describe("EntitiesService", () => {
  const service = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
  );

  beforeAll(resetTables);
  beforeEach(resetTables);


  const campaign = {
    slug: "north-realm",
    type: "campaign",
    perimeter: "campaign" as const,
    title: "The North Realm",
  };
  const chapter = {
    slug: "chapter-one",
    type: "chapter",
    perimeter: "campaign" as const,
    title: "Chapter One",
  };
  const scene = {
    slug: "scene-one",
    type: "scene",
    perimeter: "campaign" as const,
    title: "Scene One",
  };

  it("creates and reads a record", async () => {
    const created = await service.create(campaign);
    expect(created.slug).toBe("north-realm");
    expect(created.tags).toEqual([]);
    const read = await service.getBySlug("north-realm");
    expect(read.title).toBe("The North Realm");
  });

  it("stamps the author on creation", async () => {
    const authorId = "11111111-1111-4111-8111-111111111111";
    await testDb
      .insert(users)
      .values({ id: authorId, username: "author", email: "author@example.com", displayName: "Author", passwordHash: "x" })
      .onConflictDoNothing();
    const created = await service.create({ ...scene, slug: "scene-authored" }, authorId);
    expect(created.createdBy).toBe(authorId);
  });

  it("leaves the author null when creation is not attributed", async () => {
    const created = await service.create({ ...scene, slug: "scene-anonymous" });
    expect(created.createdBy).toBeNull();
  });

  it("refuses a duplicate slug", async () => {
    await service.create(campaign);
    await expect(service.create(campaign)).rejects.toThrow(
      /already exists/,
    );
  });

  it("updates without touching the slug", async () => {
    await service.create(campaign);
    const updated = await service.update("north-realm", {
      title: "Renamed",
      fields: {},
    });
    expect(updated.title).toBe("Renamed");
    expect(updated.slug).toBe("north-realm");
  });

  it("refuses deleting a record that children reference as parent", async () => {
    await service.create(campaign);
    await service.create(chapter);
    await service.relationships.attachReference(
      "chapter-one",
      "campaign",
      "north-realm",
    );
    await expect(service.delete("north-realm")).rejects.toThrow(
      /children attached/,
    );
    await service.delete("chapter-one");
    await service.delete("north-realm");
  });

  it("enforces a single parent and lists children at the parent", async () => {
    await service.create(campaign);
    await service.create(chapter);
    // A 0..1 field set a second time replaces its target: the child keeps
    // exactly one campaign link.
    await service.relationships.attachReference(
      "chapter-one",
      "campaign",
      "north-realm",
    );
    const children = await service.relationships.listChildren(
      "north-realm",
      "campaign",
    );
    expect(children.map((c) => c.slug)).toEqual(["chapter-one"]);
  });

  it("resolves the owning campaign through the parent chain", async () => {
    await service.create(campaign);
    await service.create(chapter);
    await service.create(scene);
    await service.relationships.attachReference(
      "chapter-one",
      "campaign",
      "north-realm",
    );
    await service.relationships.attachReference("scene-one", "chapter", "chapter-one");
    const owned = { slug: "north-realm", title: "The North Realm" };
    expect(await service.campaignOf(await service.getBySlug("north-realm"))).toEqual(owned);
    expect(await service.campaignOf(await service.getBySlug("chapter-one"))).toEqual(owned);
    expect(await service.campaignOf(await service.getBySlug("scene-one"))).toEqual(owned);
  });

  it("collects backlinks: reverse references and incoming mentions", async () => {
    await service.create({
      slug: "lone-place",
      type: "places",
      perimeter: "world",
      title: "Lone Place",
    });
    const nation = await service.create({
      slug: "north-kingdom",
      type: "nations",
      perimeter: "world",
      title: "North Kingdom",
      // geography is a 0..n reference field of the nations template:
      // it lives in the relationships table, never in fields.
    });
    await service.relationships.attachReference(
      "north-kingdom",
      "geography",
      "lone-place",
    );
    // A prose mention of the place in a second record.
    const storyteller = await service.create({
      slug: "storyteller",
      type: "characters-and-entities",
      perimeter: "world",
      title: "Storyteller",
      fields: { public_description: "Tales of @lone-place." },
    });
    const backlinks = await service.backlinksOf("lone-place");
    expect(backlinks.fields.geography).toEqual([
      { slug: "north-kingdom", title: "North Kingdom" },
    ]);
    expect(backlinks.mentions).toEqual([{ slug: "storyteller", title: "Storyteller" }]);
  });

  it("returns no owning campaign for a world record", async () => {
    const place = await service.create({
      slug: "lone-place",
      type: "places",
      perimeter: "world",
      title: "Lone Place",
    });
    expect(await service.campaignOf(place)).toBeNull();
  });

  it("aggregates play tracking upward", async () => {
    await service.create(campaign);
    await service.create(chapter);
    await service.create(scene);
    await service.relationships.attachReference(
      "chapter-one",
      "campaign",
      "north-realm",
    );
    await service.relationships.attachReference("scene-one", "chapter", "chapter-one");

    const before = await service.tracking("north-realm");
    expect(before.status).toBe("not_played");

    await service.update("scene-one", { fields: { play_status: "in_progress" } });
    const during = await service.tracking("chapter-one");
    expect(during.status).toBe("in_progress");
    const campaignDuring = await service.tracking("north-realm");
    expect(campaignDuring.status).toBe("in_progress");

    await service.update("scene-one", { fields: { play_status: "played" } });
    const after = await service.tracking("chapter-one");
    expect(after.status).toBe("played");
    const campaignAfter = await service.tracking("north-realm");
    expect(campaignAfter.status).toBe("played");

    // A played scene with an untouched sibling keeps the parent in
    // progress: work has started, it is not finished.
    await service.create({
      slug: "scene-two",
      type: "scene",
      perimeter: "campaign",
      title: "Scene Two",
    });
    await service.relationships.attachReference("scene-two", "chapter", "chapter-one");
    const restarted = await service.tracking("chapter-one");
    expect(restarted.status).toBe("in_progress");
    expect((await service.tracking("north-realm")).status).toBe("in_progress");

    // The tree is fully recursive: scenes nest under their chapter,
    // and every node carries its title.
    expect(campaignAfter.children[0]?.title).toBe("Chapter One");
    expect(
      campaignAfter.children[0]?.children.map((scene) => scene.title),
    ).toEqual(["Scene One"]);
  });
});

describe("EntitiesService edge cases", () => {
  const service = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
  );

  beforeEach(resetTables);


  it("writes the mention set on create and replaces it on update", async () => {
    await service.create({
      slug: "mentioning-place",
      type: "places",
      perimeter: "world",
      title: "Mentioning Place",
      fields: {
        public_description: "Below @north-realm, above @chapter-one.",
      },
    });
    const [owner] = await testDb
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.slug, "mentioning-place"));
    let rows = await testDb.select().from(mentions).where(eq(mentions.entityId, owner.id));
    expect(rows.map((r) => r.targetSlug).sort()).toEqual(["chapter-one", "north-realm"]);

    await service.update("mentioning-place", {
      fields: { public_description: "Now only @north-realm." },
    });
    rows = await testDb.select().from(mentions).where(eq(mentions.entityId, owner.id));
    expect(rows.map((r) => r.targetSlug)).toEqual(["north-realm"]);
  });

  it("keeps mention rows pointing at deleted targets (dead links)", async () => {
    await service.create({
      slug: "ghost-place",
      type: "places",
      perimeter: "world",
      title: "Ghost Place",
      fields: { public_description: "A dead @vanished-place." },
    });
    const [owner] = await testDb
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.slug, "ghost-place"));
    const rows = await testDb.select().from(mentions).where(eq(mentions.entityId, owner.id));
    expect(rows.map((r) => r.targetSlug)).toEqual(["vanished-place"]);
  });

  it("suggests records by title for autocomplete", async () => {
    await service.create({
      slug: "validated-place",
      type: "places",
      perimeter: "world",
      title: "Silver City",
    });
    const results = await service.autocomplete("silver");
    expect(results.map((r) => r.slug)).toContain("validated-place");
  });

  it("filters autocomplete suggestions by template type", async () => {
    await service.create({
      slug: "typed-campaign",
      type: "campaign",
      perimeter: "campaign",
      title: "A Silver Campaign",
    });
    const results = await service.autocomplete("silver", "campaign");
    expect(results.every((r) => r.type === "campaign")).toBe(true);
    expect(results.map((r) => r.slug)).toContain("typed-campaign");
  });
  it("rejects reading an unknown slug", async () => {
    await expect(service.getBySlug("does-not-exist")).rejects.toThrow(
      /not found/,
    );
  });

  it("rejects updating an unknown slug", async () => {
    await expect(
      service.update("does-not-exist", { title: "X" }),
    ).rejects.toThrow(/not found/);
  });

  it("filters the list by perimeter and type", async () => {
    await service.create({
      slug: "a-campaign",
      type: "campaign",
      perimeter: "campaign",
      title: "A",
    });
    await service.create({
      slug: "a-place",
      type: "places",
      perimeter: "world",
      title: "B",
    });
    const campaigns = await service.list({
      perimeter: "campaign",
      type: "campaign",
    });
    expect(campaigns.map((row) => row.slug)).toEqual(["a-campaign"]);
  });
  it("validates fields against the template schema", async () => {
    const places = { slug: "validated-place", type: "places", perimeter: "world" as const, title: "Validated Place", fields: { population: "2M" } };
    await service.create(places);
    const read = await service.getBySlug("validated-place");
    expect(read.fields).toEqual({ population: "2M" });
  });

  it("rejects unknown template fields with a stable code", async () => {
    const bad = { slug: "bad-place", type: "places", perimeter: "world" as const, title: "Bad Place", fields: { nickname: "The Pearl" } };
    await expect(service.create(bad)).rejects.toMatchObject({
      response: { code: "fields_invalid" },
    });
  });

  it("keeps structural validation for unregistered types", async () => {
    await service.create({
      slug: "custom-type-record",
      type: "custom-type",
      perimeter: "world",
      title: "Custom",
      fields: { anything: [1, 2, 3] },
    });
    const read = await service.getBySlug("custom-type-record");
    expect(read.fields).toEqual({ anything: [1, 2, 3] });
  });
});

describe("parseMentionSlugs", () => {
  it("extracts word-start mentions", () => {
    expect(parseMentionSlugs("See @silver-city and @north-realm.")).toEqual([
      "silver-city",
      "north-realm",
    ]);
  });

  it("ignores email addresses by construction", () => {
    expect(parseMentionSlugs("write to user@example.com or me@work.org")).toEqual([]);
  });

  it("deduplicates and keeps first-seen order", () => {
    expect(parseMentionSlugs("@b then @a then @b again")).toEqual(["b", "a"]);
  });

  it("returns nothing without mentions", () => {
    expect(parseMentionSlugs("plain prose, no mentions at all")).toEqual([]);
  });
});

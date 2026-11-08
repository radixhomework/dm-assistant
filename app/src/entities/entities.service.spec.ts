import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  closeTestClient,
  resetTables,
  testDb,
} from "../testing/test-db.js";
import { EntitiesService, foldStatuses } from "./entities.service.js";
import { RelationshipsService } from "../relationships/relationships.service.js";

describe("foldStatuses (pure)", () => {
  it("returns not played for no children", () => {
    expect(foldStatuses([])).toBe("not_played");
  });
  it("returns in progress when any child is in progress", () => {
    expect(foldStatuses(["played", "in_progress"])).toBe("in_progress");
  });
  it("returns played only when all children are played", () => {
    expect(foldStatuses(["played", "played"])).toBe("played");
    expect(foldStatuses(["played", "not_played"])).toBe("not_played");
  });
});

describe("EntitiesService", () => {
  const service = new EntitiesService(
    testDb,
    new RelationshipsService(testDb),
  );

  beforeAll(resetTables);
  beforeEach(resetTables);
  afterAll(closeTestClient);

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
      body: "Body text",
    });
    expect(updated.title).toBe("Renamed");
    expect(updated.slug).toBe("north-realm");
  });

  it("refuses deleting a record that children reference as parent", async () => {
    await service.create(campaign);
    await service.create(chapter);
    await service.relationships.attach(
      "chapter-one",
      "north-realm",
      "chapter",
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
    await service.relationships.attach(
      "chapter-one",
      "north-realm",
      "chapter",
    );
    await expect(
      service.relationships.attach("chapter-one", "north-realm", "chapter"),
    ).rejects.toThrow(/already carries/);
    const children = await service.relationships.listChildren(
      "north-realm",
      "chapter",
    );
    expect(children.map((c) => c.slug)).toEqual(["chapter-one"]);
  });

  it("aggregates play tracking upward", async () => {
    await service.create(campaign);
    await service.create(chapter);
    await service.create(scene);
    await service.relationships.attach(
      "chapter-one",
      "north-realm",
      "chapter",
    );
    await service.relationships.attach("scene-one", "chapter-one", "scene");

    const before = await service.tracking("north-realm");
    expect(before.status).toBe("not_played");

    await service.update("scene-one", { fields: { status: "in_progress" } });
    const during = await service.tracking("chapter-one");
    expect(during.status).toBe("in_progress");
    const campaignDuring = await service.tracking("north-realm");
    expect(campaignDuring.status).toBe("in_progress");

    await service.update("scene-one", { fields: { status: "played" } });
    const after = await service.tracking("chapter-one");
    expect(after.status).toBe("played");
    const campaignAfter = await service.tracking("north-realm");
    expect(campaignAfter.status).toBe("played");
  });
});

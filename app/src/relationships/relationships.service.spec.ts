import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { resetTables, testDb } from "../testing/test-db.js";
import { RelationshipsService } from "./relationships.service.js";

describe("RelationshipsService", () => {
  const service = new RelationshipsService(testDb);

  beforeAll(async () => {
    await resetTables();
    await testDb.execute(
      sql`insert into entities (id, slug, type, perimeter, title) values (gen_random_uuid(), 'chapter-a', 'chapter', 'campaign', 'A'), (gen_random_uuid(), 'campaign-a', 'campaign', 'campaign', 'C'), (gen_random_uuid(), 'place-a', 'places', 'world', 'P')`,
    );
  });


  it("rejects an unknown child or parent slug", async () => {
    await expect(
      service.attach("ghost", "also-ghost", "chapter"),
    ).rejects.toThrow(/not found/);
  });

  it("rejects a kind that does not match the child type", async () => {
    await expect(
      service.attach("chapter-a", "campaign-a", "scene"),
    ).rejects.toThrow(/hierarchy role/);
  });

  it("rejects a parent of the wrong type", async () => {
    await expect(
      service.attach("chapter-a", "place-a", "chapter"),
    ).rejects.toThrow(/must be a campaign/);
  });
});

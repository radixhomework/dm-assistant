import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { resetTables, testDb } from "../testing/test-db.js";
import { RelationshipsService } from "./relationships.service.js";

describe("RelationshipsService", () => {
  const service = new RelationshipsService(testDb);

  beforeAll(async () => {
    await resetTables();
    await testDb.execute(
      sql`insert into entities (id, slug, type, perimeter, title) values (gen_random_uuid(), 'chapter-a', 'chapter', 'campaign', 'A'), (gen_random_uuid(), 'campaign-a', 'campaign', 'campaign', 'C'), (gen_random_uuid(), 'campaign-b', 'campaign', 'campaign', 'C2'), (gen_random_uuid(), 'place-a', 'places', 'world', 'P'), (gen_random_uuid(), 'nation-a', 'nations', 'world', 'N')`,
    );
  });

  it("rejects an unknown child or target slug", async () => {
    await expect(
      service.attachReference("ghost", "campaign", "also-ghost"),
    ).rejects.toThrow(/not found/);
  });

  it("rejects a field the child's template does not declare", async () => {
    // A chapter has no 'capital' reference field.
    await expect(
      service.attachReference("chapter-a", "capital", "place-a"),
    ).rejects.toThrow(/not a reference field/);
  });

  it("rejects a target of the wrong type", async () => {
    // A chapter's campaign field expects a campaign, not a place.
    await expect(
      service.attachReference("chapter-a", "campaign", "place-a"),
    ).rejects.toThrow(/expects a campaign/);
  });

  it("replaces the target of a 0..1 reference", async () => {
    await service.attachReference("chapter-a", "campaign", "campaign-a");
    // Re-attaching through the same 0..1 field replaces the target.
    await service.attachReference("chapter-a", "campaign", "campaign-b");
    const rows = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'chapter-a') and kind = 'campaign' and to_id = (select id from entities where slug = 'campaign-b')`,
    );
    expect(rows[0]).toMatchObject({ count: 1 });
  });

  it("detaches the field's reference", async () => {
    await service.attachReference("chapter-a", "campaign", "campaign-a");
    await service.detachReference("chapter-a", "campaign");
    const rows = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'chapter-a') and kind = 'campaign'`,
    );
    expect(rows[0]).toMatchObject({ count: 0 });
  });
});

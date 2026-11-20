import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { resetTables, testDb } from "../testing/test-db.js";
import { isUniqueViolation } from "../database/unique-violation.js";
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

  it("replaces the target of a non-hierarchy 0..1 reference", async () => {
    await testDb.execute(
      sql`insert into entities (id, slug, type, perimeter, title) values (gen_random_uuid(), 'place-b', 'places', 'world', 'P2')`,
    );
    await service.attachReference("nation-a", "capital", "place-a");
    // Re-attaching through the same 0..1 field replaces the target —
    // hierarchy fields are the exception, tested below.
    await service.attachReference("nation-a", "capital", "place-b");
    const rows = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'nation-a') and kind = 'capital' and to_id = (select id from entities where slug = 'place-b')`,
    );
    expect(rows[0]).toMatchObject({ count: 1 });
    const all = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'nation-a') and kind = 'capital'`,
    );
    expect(all[0]).toMatchObject({ count: 1 });
    await service.detachReference("nation-a", "capital");
  });

  it("refuses a second parent through a hierarchy field", async () => {
    await testDb.execute(
      sql`insert into entities (id, slug, type, perimeter, title) values (gen_random_uuid(), 'chapter-b', 'chapter', 'campaign', 'B'), (gen_random_uuid(), 'scene-b', 'scene', 'campaign', 'S2')`,
    );
    await service.attachReference("scene-b", "chapter", "chapter-a");
    // The hierarchy keeps re-parenting deliberate: a second parent is
    // refused, never silently replaced.
    await expect(
      service.attachReference("scene-b", "chapter", "chapter-b"),
    ).rejects.toThrow(/detach it first/);
    const rows = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'scene-b') and kind = 'chapter' and to_id = (select id from entities where slug = 'chapter-a')`,
    );
    expect(rows[0]).toMatchObject({ count: 1 });
    await service.detachReference("scene-b", "chapter");
  });

  it("refuses a concurrent second hierarchy parent exactly once", async () => {
    // The pre-check cannot reserve the observed state: two concurrent
    // parents for one scene must be settled by the one-per-child index —
    // one insert wins, the other is refused instead of replacing it.
    await testDb.execute(
      sql`insert into entities (id, slug, type, perimeter, title) values (gen_random_uuid(), 'scene-c', 'scene', 'campaign', 'S3')`,
    );
    const outcomes = await Promise.allSettled([
      service.attachReference("scene-c", "chapter", "chapter-a"),
      service.attachReference("scene-c", "chapter", "chapter-b"),
    ]);
    const fulfilled = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );
    const rejected = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    ) as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0].reason)).toMatch(/detach it first/);
    const rows = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'scene-c') and kind = 'chapter'`,
    );
    expect(rows[0]).toMatchObject({ count: 1 });
    await service.detachReference("scene-c", "chapter");
  });

  it("refuses to delete a chapter that scenes still reference", async () => {
    // A scene attached through the 'chapter' hierarchy field blocks the
    // parent's deletion just like a campaign's chapter does.
    await testDb.execute(
      sql`insert into entities (id, slug, type, perimeter, title) values (gen_random_uuid(), 'scene-a', 'scene', 'campaign', 'S')`,
    );
    await service.attachReference("scene-a", "chapter", "chapter-a");
    await expect(
      service.assertNoChildren(
        (
          await testDb.execute(
            sql`select id from entities where slug = 'chapter-a'`,
          )
        )[0].id,
      ),
    ).rejects.toThrow(/has children attached/);
    await service.detachReference("scene-a", "chapter");
    await expect(
      service.assertNoChildren(
        (
          await testDb.execute(
            sql`select id from entities where slug = 'chapter-a'`,
          )
        )[0].id,
      ),
    ).resolves.toBeUndefined();
  });

  it("detaches the field's reference", async () => {
    await service.attachReference("chapter-a", "campaign", "campaign-a");
    await service.detachReference("chapter-a", "campaign");
    const rows = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'chapter-a') and kind = 'campaign'`,
    );
    expect(rows[0]).toMatchObject({ count: 0 });
  });

  it("refuses a concurrent duplicate 0..n attachment exactly once", async () => {
    // Both requests can pass the pre-check before either inserts: the
    // database constraint settles the race, the service translates it.
    const outcomes = await Promise.allSettled([
      service.attachReference("nation-a", "geography", "place-a"),
      service.attachReference("nation-a", "geography", "place-a"),
    ]);
    const fulfilled = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );
    const rejected = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    ) as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0].reason)).toMatch(/already attached/);
    const rows = await testDb.execute(
      sql`select count(*)::int as count from relationships where from_id = (select id from entities where slug = 'nation-a') and kind = 'geography'`,
    );
    expect(rows[0]).toMatchObject({ count: 1 });
    await service.detachReference("nation-a", "geography");
  });

  it("stores each target at most once per field in the database", async () => {
    // The unique constraint is the authority: a direct duplicate insert
    // (the race's losing write) is refused by the schema itself, and the
    // drizzle-wrapped rejection is one the service helper recognizes.
    await service.attachReference("nation-a", "geography", "place-a");
    const failure = await testDb
      .execute(
        sql`insert into relationships (from_id, to_id, kind) values ((select id from entities where slug = 'nation-a'), (select id from entities where slug = 'place-a'), 'geography')`,
      )
      .then(
        () => null,
        (insertError: unknown) => insertError,
      );
    expect(failure).toBeInstanceOf(Error);
    expect(isUniqueViolation(failure)).toBe(true);
    await service.detachReference("nation-a", "geography");
  });
});

import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { resetTables, testDb } from "../testing/test-db.js";
import { sessions, users } from "../database/schema.js";
import { SessionStore } from "./session.store.js";

describe("SessionStore", () => {
  const store = new SessionStore(testDb);
  let userId: string;

  beforeAll(async () => {
    await resetTables();
    const [row] = await testDb
      .insert(users)
      .values({
        email: `sessions-${randomUUID()}@example.com`,
        displayName: "Session Owner",
        passwordHash: "$argon2id$placeholder",
        role: "admin",
      })
      .returning();
    userId = row.id;
  });


  it("round-trips a session through set and get", async () => {
    const sid = randomUUID();
    const data = { userId, cookie: {}, nested: { ok: true } };
    await new Promise<void>((resolve, reject) =>
      store.set(sid, data, (err) => (err ? reject(err) : resolve())),
    );
    await new Promise<void>((resolve) =>
      store.get(sid, (err, session) => {
        expect(err).toBeNull();
        expect(session?.userId).toBe(userId);
        resolve();
      }),
    );
  });

  it("destroys a session", async () => {
    const sid = randomUUID();
    await new Promise<void>((resolve, reject) =>
      store.set(sid, { userId }, (err) => (err ? reject(err) : resolve())),
    );
    await new Promise<void>((resolve, reject) =>
      store.destroy(sid, (err) => (err ? reject(err) : resolve())),
    );
    await new Promise<void>((resolve) =>
      store.get(sid, (err, session) => {
        expect(session).toBeNull();
        resolve();
      }),
    );
  });

  it("prunes expired sessions", async () => {
    const sid = randomUUID();
    await testDb.insert(sessions).values({
      id: sid,
      userId,
      data: { userId },
      expiresAt: new Date(Date.now() - 1000),
    });
    await store.pruneExpired();
    const rows = await testDb
      .select()
      .from(sessions)
      .where(eq(sessions.id, sid));
    expect(rows.length).toBe(0);
  });
});

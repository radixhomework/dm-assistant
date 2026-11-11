import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { CreateUserInput } from "@dm/schemas";
import { resetTables, testDb } from "../testing/test-db.js";
import { entities } from "../database/schema.js";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
  const service = new UsersService(testDb);
  const emails: string[] = [];

  beforeAll(resetTables);


  function input(): CreateUserInput {
    const email = `${randomUUID()}@example.com`;
    emails.push(email);
    return {
      username: email.split("@")[0],
      email,
      password: "a-long-enough-passphrase",
      displayName: "Test DM",
      role: "dm",
    };
  }

  it("creates a user with dm role and active status by default", async () => {
    const user = await service.create(input());
    expect(user.role).toBe("dm");
    expect(user.status).toBe("active");
    expect(user.passwordHash).toBeUndefined();
  });

  it("hashes the password with argon2id (never stored in clear)", async () => {
    const created = await service.create(input());
    const row = await service.findByEmail(created.email);
    expect(row?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row?.passwordHash).not.toContain("a-long-enough-passphrase");
  });

  it("finds users by email case-insensitively", async () => {
    const created = await service.create(input());
    const found = await service.findByEmail(created.email.toUpperCase());
    expect(found?.email).toBe(created.email);
  });

  it("blocks and unblocks accounts", async () => {
    const created = await service.create(input());
    const blocked = await service.setStatus(created.id, "blocked");
    expect(blocked?.status).toBe("blocked");
    const active = await service.setStatus(created.id, "active");
    expect(active?.status).toBe("active");
  });

  it("lists users", async () => {
    await service.create(input());
    const list = await service.list();
    expect(list.length).toBeGreaterThan(0);
  });

  it("deletes a user without campaigns", async () => {
    const created = await service.create(input());
    await service.deleteUser(created.id, randomUUID());
    expect(await service.findById(created.id)).toBeNull();
  });

  it("refuses deleting a user who created a campaign", async () => {
    const creator = await service.create(input());
    await testDb.insert(entities).values({
      slug: `campagne-${randomUUID()}`,
      type: "campaign",
      perimeter: "campaign",
      title: "Campagne de test",
      createdBy: creator.id,
    });
    await expect(service.deleteUser(creator.id, randomUUID())).rejects.toThrow(/campaigns/);
  });

  it("refuses self-deletion", async () => {
    const acting = await service.create(input());
    await expect(service.deleteUser(acting.id, acting.id)).rejects.toThrow(/own account/);
  });
});

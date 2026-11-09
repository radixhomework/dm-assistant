import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { WizardInput } from "@dm/schemas";
import { resetTables, testDb } from "../testing/test-db.js";
import { settings, users } from "../database/schema.js";
import { SessionStore } from "./session.store.js";
import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
  const service = new AuthService(testDb, new SessionStore(testDb));

  beforeAll(resetTables);


  function wizardInput(): WizardInput {
    return {
      email: `admin-${randomUUID()}@example.com`,
      password: "a-long-enough-passphrase",
      displayName: "The DM",
      worldName: "My World",
    };
  }

  async function createDm(): Promise<string> {
    const email = `dm-${randomUUID()}@example.com`;
    await testDb
      .insert(users)
      .values({
        email,
        displayName: "Other DM",
        passwordHash: await (await import("@node-rs/argon2")).hash("a-long-enough-passphrase"),
        role: "dm",
      });
    return email;
  }

  it("bootstraps the admin and the world settings atomically", async () => {
    const input = wizardInput();
    const result = await service.bootstrapInstance(input);
    expect(result.email).toBe(input.email);
    const rows = await testDb.select().from(settings);
    const keys = rows.map((row) => row.key);
    expect(keys).toContain("world_name");
    const [admin] = await testDb
      .select()
      .from(users)
      .where(eq(users.email, input.email));
    expect(admin.role).toBe("admin");
  });

  it("refuses a second bootstrap", async () => {
    await expect(service.bootstrapInstance(wizardInput())).rejects.toThrow(
      /already bootstrapped/,
    );
  });

  it("logs a valid user in and attributes the session", async () => {
    const email = await createDm();
    // A real password hash is required for the login flow:
    const { hash } = await import("@node-rs/argon2");
    await testDb
      .update(users)
      .set({ passwordHash: await hash("a-long-enough-passphrase") })
      .where(eq(users.email, email));
    const session: { userId?: string } = {};
    const user = await service.login(
      email,
      "a-long-enough-passphrase",
      session,
    );
    expect(user.email).toBe(email);
    expect(session.userId).toBeDefined();
  });

  it("rejects a wrong password", async () => {
    const email = await createDm();
    await expect(
      service.login(email, "wrong-passphrase-entirely", {}),
    ).rejects.toThrow(/Invalid credentials/);
  });

  it("rejects a blocked account", async () => {
    const email = await createDm();
    const { hash } = await import("@node-rs/argon2");
    await testDb
      .update(users)
      .set({ passwordHash: await hash("a-long-enough-passphrase") })
      .where(eq(users.email, email));
    await testDb
      .update(users)
      .set({ status: "blocked" })
      .where(eq(users.email, email));
    await expect(
      service.login(email, "a-long-enough-passphrase", {}),
    ).rejects.toThrow(/blocked/);
  });
});

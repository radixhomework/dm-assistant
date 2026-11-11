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
      username: `admin-${randomUUID().slice(0, 8)}`,
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
        username: `dm-${randomUUID().slice(0, 8)}`,
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

  async function createAdmin(): Promise<{ id: string; email: string; password: string }> {
    const password = "a-long-enough-passphrase";
    const email = `admin-${randomUUID()}@example.com`;
    const { hash } = await import("@node-rs/argon2");
    const [row] = await testDb
      .insert(users)
      .values({ username: `admin-${randomUUID().slice(0, 8)}`, email, displayName: "The DM", passwordHash: await hash(password), role: "admin" })
      .returning();
    return { id: row.id, email, password };
  }

  it("updates a profile (email, display name, ui locale)", async () => {
    const admin = await createAdmin();
    const movedEmail = `moved-${admin.id.slice(0, 8)}@example.com`;
    const updated = await service.updateProfile(admin.id, {
      email: movedEmail,
      displayName: "Renamed DM",
      uiLocale: "fr",
    });
    expect(updated.email).toBe(movedEmail);
    expect(updated.displayName).toBe("Renamed DM");
    expect(updated.uiLocale).toBe("fr");
  });

  it("updates profile fields partially", async () => {
    const admin = await createAdmin();
    const updated = await service.updateProfile(admin.id, { displayName: "Partially Renamed" });
    expect(updated.displayName).toBe("Partially Renamed");
    expect(updated.email).toBe(admin.email);
    expect(updated.uiLocale).toBeNull();
  });

  it("refuses a profile update for an unknown user", async () => {
    await expect(
      service.updateProfile("00000000-0000-4000-8000-000000000000", { displayName: "X" }),
    ).rejects.toThrow();
  });

  it("refuses a password change for an unknown user", async () => {
    await expect(
      service.changePassword("00000000-0000-4000-8000-000000000000", "a", "b-passphrase-12"),
    ).rejects.toThrow();
  });

  it("refuses a profile email already used by another account", async () => {
    const first = await createAdmin();
    const second = await createAdmin();
    const admin = { id: first.id };
    await expect(
      service.updateProfile(admin.id, { email: second.email }),
    ).rejects.toThrow(/already used/);
  });

  it("changes a password after verifying the current one", async () => {
    const admin = await createAdmin();
    await service.changePassword(admin.id, admin.password, "the-next-passphrase");
    const session = { userId: undefined as string | undefined };
    const logged = await service.login(admin.email, "the-next-passphrase", session);
    expect(logged.id).toBe(admin.id);
  });

  it("refuses a password change with a wrong current password", async () => {
    const admin = await createAdmin();
    await expect(
      service.changePassword(admin.id, "wrong-current-pass", "another-passphrase"),
    ).rejects.toThrow(/incorrect/);
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

  it("logs in by username as well as by email", async () => {
    const { hash } = await import("@node-rs/argon2");
    const username = `dm-${randomUUID().slice(0, 8)}`;
    const email = `dm-${randomUUID()}@example.com`;
    await testDb
      .insert(users)
      .values({
        username,
        email,
        displayName: "Username DM",
        passwordHash: await hash("a-long-enough-passphrase"),
        role: "dm",
      });
    const session: { userId?: string } = {};
    const byUsername = await service.login(username, "a-long-enough-passphrase", session);
    expect(byUsername.username).toBe(username);
    const byEmail = await service.login(email, "a-long-enough-passphrase", {});
    expect(byEmail.username).toBe(username);
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

import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import type { CreateUserInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { entities, users } from "../database/schema.js";

function safeUiLocale(value: string | null | undefined): SafeUser["uiLocale"] {
  if (value === "fr") return "fr";
  if (value === "en") return "en";
  return null;
}

/** Public projection — never expose the password hash (S3358-safe, shared). */
export function safeUserOf(row: {
  id: string;
  username?: string | null;
  email: string;
  displayName: string;
  role: string;
  status: string;
  uiLocale?: string | null;
}): SafeUser {
  return {
    id: row.id,
    username: row.username ?? null,
    email: row.email,
    displayName: row.displayName,
    role: row.role as SafeUser["role"],
    status: row.status as SafeUser["status"],
    uiLocale: safeUiLocale(row.uiLocale),
  };
}

export type SafeUser = {
  id: string;
  username: string | null;
  email: string;
  displayName: string;
  role: "admin" | "dm";
  status: "active" | "blocked";
  uiLocale: "en" | "fr" | null;
};

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: CreateUserInput): Promise<SafeUser> {
    const passwordHash = await hash(input.password);
    try {
      const [row] = await this.db
        .insert(users)
        .values({
          username: input.username,
          email: (input.email ?? `${input.username}@instance.local`).toLowerCase(),
          displayName: input.displayName,
          passwordHash,
          role: input.role,
        })
        .returning();
      return safeUserOf(row);
    } catch (error) {
      // Drizzle wraps driver errors: the constraint code may sit on the
      // error itself or on its cause.
      const codes = [
        (error as { code?: string }).code,
        (error as { cause?: { code?: string } }).cause?.code,
      ];
      if (codes.includes("23505")) {
        throw new ConflictException("Username or email already used");
      }
      throw error;
    }
  }

  async findByEmail(email: string) {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return row ?? null;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    return row ?? null;
  }

  async list(): Promise<SafeUser[]> {
    const rows = await this.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
    return rows.map((row) => safeUserOf(row));
  }

  async setStatus(
    id: string,
    status: "active" | "blocked",
  ): Promise<SafeUser | null> {
    const [row] = await this.db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return row ? safeUserOf(row) : null;
  }

  /**
   * Admin user deletion. Refused while the user created any campaign
   * record (their content must not orphan) and for the acting admin
   * themselves. Non-campaign authorships keep their records; the author
   * reference is cleared by the FK on-delete rule.
   */
  async deleteUser(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) {
      throw new ConflictException("You cannot delete your own account");
    }
    const [campaign] = await this.db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.createdBy, id), eq(entities.perimeter, "campaign")))
      .limit(1);
    if (campaign) {
      throw new ConflictException("This user still has campaigns");
    }
    await this.db.delete(users).where(eq(users.id, id));
  }

  /** Admin password reset: replaces the hash, touches nothing else. */
  async setPassword(id: string, newPassword: string): Promise<SafeUser | null> {
    const passwordHash = await hash(newPassword);
    const [row] = await this.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning();
    return row ? safeUserOf(row) : null;
  }

  /** Public projection — never expose the password hash. */
  safeOf(row: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    uiLocale?: string | null;
  }): SafeUser {
    return safeUserOf(row);
  }

  async verifyPassword(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    return verify(passwordHash, password);
  }

}

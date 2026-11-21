import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { hash } from "@node-rs/argon2";
import { and, eq, ne, or, sql } from "drizzle-orm";
import type { UpdateProfileInput, WizardInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { settings, users } from "../database/schema.js";
import { SessionStore } from "./session.store.js";
import { safeUserOf, type SafeUser } from "../users/users.service.js";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SessionStore) private readonly sessionStore: SessionStore,
  ) {}

  async adminExists(): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    return row !== undefined;
  }

  async login(
    identifier: string,
    password: string,
    session: { userId?: string },
  ): Promise<{ id: string; username: string | null; email: string; role: string }> {
    const id = identifier.toLowerCase();
    const [user] = await this.db
      .select()
      .from(users)
      .where(or(eq(users.username, id), eq(users.email, id)));
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const { verify } = await import("@node-rs/argon2");
    const passwordOk = await verify(user.passwordHash, password);
    if (!passwordOk) {
      throw new UnauthorizedException("Invalid credentials");
    }
    if (user.status === "blocked") {
      throw new UnauthorizedException("This account is blocked");
    }

    // Attribute the session row to the user, then prune expired sessions
    // opportunistically (cheap housekeeping instead of a cron at P1).
    session.userId = user.id;
    await this.sessionStore.pruneExpired();

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  /** Creates the administrator and the world in one transaction. */
  async bootstrapInstance(input: WizardInput): Promise<{ email: string }> {
    if (await this.adminExists()) {
      throw new ConflictException("Instance already bootstrapped");
    }
    const passwordHash = await hash(input.password);
    await this.db.transaction(async (tx) => {
      const [admin] = await tx
        .insert(users)
        .values({
          username: input.username,
          // No email at creation (login is by username); a placeholder keeps
          // the NOT NULL constraint until a real one is set in the profile.
          email: `${input.username}@instance.local`,
          displayName: input.displayName,
          passwordHash,
          role: "admin",
        })
        .returning();

      await tx
        .insert(settings)
        .values({ key: "world_name", value: input.worldName })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: sql`excluded.value`, updatedAt: new Date() },
        });
      return admin;
    });
    return { email: `${input.username}@instance.local` };
  }

  /** Profile self-service: email, display name and UI language. */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<SafeUser> {
    if (input.email !== undefined) {
      const email = input.email.toLowerCase();
      const [taken] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, userId)))
        .limit(1);
      if (taken) {
        throw new ConflictException("This email is already used");
      }
      const [row] = await this.db
        .update(users)
        .set({ email, ...(input.displayName !== undefined ? { displayName: input.displayName } : {}), ...(input.uiLocale !== undefined ? { uiLocale: input.uiLocale } : {}) })
        .where(eq(users.id, userId))
        .returning();
      if (!row) throw new UnauthorizedException();
      return safeUserOf(row);
    }
    const [row] = await this.db
      .update(users)
      .set({
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.uiLocale !== undefined ? { uiLocale: input.uiLocale } : {}),
      })
      .where(eq(users.id, userId))
      .returning();
    if (!row) throw new UnauthorizedException();
    return safeUserOf(row);
  }

  /** Password change: the current password must verify first. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const [row] = await this.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) {
      throw new UnauthorizedException();
    }
    const { verify } = await import("@node-rs/argon2");
    const currentOk = await verify(row.passwordHash, currentPassword);
    if (!currentOk) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    const passwordHash = await hash(newPassword);
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }
}

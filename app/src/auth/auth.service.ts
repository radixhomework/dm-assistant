import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import type { WizardInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { settings, users } from "../database/schema.js";
import { SessionStore } from "./session.store.js";

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
    email: string,
    password: string,
    session: { userId?: string },
  ): Promise<{ id: string; email: string; role: string }> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
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

    return { id: user.id, email: user.email, role: user.role };
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
          email: input.email.toLowerCase(),
          displayName: input.displayName,
          passwordHash,
          role: "admin",
        })
        .returning();

      const settingRows = [
        { key: "world_name", value: input.worldName },
        { key: "content_language", value: input.contentLanguage },
      ];
      for (const row of settingRows) {
        await tx
          .insert(settings)
          .values(row)
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: row.value, updatedAt: new Date() },
          });
      }
      return admin;
    });
    return { email: input.email.toLowerCase() };
  }
}

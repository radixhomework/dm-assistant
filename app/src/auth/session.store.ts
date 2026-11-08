import { eq, lt } from "drizzle-orm";
import { Inject, Injectable } from "@nestjs/common";
import type { SessionData } from "express-session";
import { Store } from "express-session";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { sessions } from "../database/schema.js";

declare module "express-session" {
  // The session carries the user attribution for traceability.
  interface SessionData {
    userId?: string;
  }
}

/**
 * express-session store over the `sessions` table — keeps per-user
 * attribution (ARCHITECTURE.md §5) instead of a generic session schema.
 */
@Injectable()
export class SessionStore extends Store {
  constructor(@Inject(DB) private readonly db: Db) {
    super();
  }

  override get(
    sessionId: string,
    callback: (err: unknown, session?: SessionData | null) => void,
  ): void {
    this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .then((rows) => {
        const row = rows[0];
        if (!row || row.expiresAt.getTime() < Date.now()) {
          callback(null, null);
          return;
        }
        callback(null, row.data as SessionData);
      })
      .catch((error) => callback(error));
  }

  override set(
    sessionId: string,
    data: SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    const expiresAt = readCookieExpiry(data) ?? defaultExpiry();
    this.db
      .insert(sessions)
      .values({ id: sessionId, userId: data.userId ?? "", data, expiresAt })
      .onConflictDoUpdate({ target: sessions.id, set: { data, expiresAt } })
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  override destroy(sessionId: string, callback?: (err?: unknown) => void): void {
    this.db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  /** Removes expired rows — called opportunistically on login. */
  async pruneExpired(): Promise<void> {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}

function readCookieExpiry(data: SessionData): Date | null {
  return data.cookie?.expires ? new Date(data.cookie.expires) : null;
}

function defaultExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import type { CreateUserInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { users } from "../database/schema.js";

export type SafeUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "dm";
  status: "active" | "blocked";
};

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: CreateUserInput): Promise<SafeUser> {
    const passwordHash = await hash(input.password);
    const [row] = await this.db
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        passwordHash,
        role: input.role,
      })
      .returning();
    return this.toSafe(row);
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
    return rows.map((row) => this.toSafe(row));
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
    return row ? this.toSafe(row) : null;
  }

  /** Public projection — never expose the password hash. */
  safeOf(row: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
  }): SafeUser {
    return this.toSafe(row);
  }

  async verifyPassword(
    passwordHash: string,
    password: string,
  ): Promise<boolean> {
    return verify(passwordHash, password);
  }

  private toSafe(row: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
  }): SafeUser {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role as SafeUser["role"],
      status: row.status as SafeUser["status"],
    };
  }
}

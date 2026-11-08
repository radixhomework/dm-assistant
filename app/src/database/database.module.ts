import { Global, Inject, Module } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Env } from "@dm/schemas";
import { ENV } from "../config/env.js";

export const DB = "APP_DB";

export type Db = PostgresJsDatabase<Record<string, never>>;

/**
 * Drizzle client over postgres-js, built from the validated configuration.
 * Postgres itself is never exposed — see ARCHITECTURE.md §1 (single door).
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ENV],
      useFactory: (env: Env) =>
        drizzle(postgres(env.DATABASE_URL, { max: 10 })),
    },
  ],
  exports: [DB],
})
export class DatabaseModule {
  constructor(@Inject(ENV) private readonly env: Env) {}
}

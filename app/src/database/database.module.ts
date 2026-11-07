import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Inject, Module } from "@nestjs/common";
import type { Env } from "@dm/schemas";
import { ENV } from "../config/env.js";

export const DB = "APP_DB";

/**
 * Drizzle client over postgres-js, built from the validated configuration.
 * Postgres itself is never exposed — see ARCHITECTURE.md §1 (single door).
 */
@Module({
  providers: [
    {
      provide: DB,
      inject: [ENV],
      useFactory: (env: Env) => {
        const client = postgres(env.DATABASE_URL, { max: 10 });
        return drizzle(client);
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {
  constructor(@Inject(ENV) private readonly env: Env) {}
}

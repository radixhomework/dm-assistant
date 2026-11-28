import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { envSchema } from "@dm/schemas";

// Service tests run against a real Postgres: the throwaway container locally
// (DATABASE_URL pointing at port 55432) and the CI service container.
export const testClient = postgres(envSchema.parse(process.env).DATABASE_URL, {
  max: 5,
  idle_timeout: 2,
  connect_timeout: 10,
});

export const testDb = drizzle(testClient);

export async function resetTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE relationships, entities, catalog_sources, sessions, users, settings CASCADE`,
  );
}

/**
 * The migration-seeded built-in Internal source: catalog_sources is
 * truncated between specs, so a spec exercising catalog provenance
 * re-seeds it (the service resolves the Internal row by its flag).
 */
export async function seedInternalSource(): Promise<void> {
  await testDb.execute(
    sql`INSERT INTO catalog_sources (name, internal) VALUES ('Internal', true)`,
  );
}

export async function closeTestClient(): Promise<void> {
  await testClient.end();
}

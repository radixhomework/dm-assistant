import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { envSchema } from "@dm/schemas";

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const client = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 10 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied successfully");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

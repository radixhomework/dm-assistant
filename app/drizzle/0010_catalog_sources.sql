-- Catalog provenance (srd-catalog-import capability, round 3 of
-- search-and-catalogs): a registry of named sources — the seeded
-- built-in Internal source for records created through the application,
-- plus the external sources an administrator manages for imports (each
-- carrying an optional attribution note) — and the nullable provenance
-- FK on entities, populated for the 8 catalog types only. Source is set
-- at creation and immutable; the single rebind is the confirmed
-- cross-source import overwrite. Disabling a source only removes it
-- from import selection — badges keep showing it. Sources are never
-- deleted (records reference them); the Internal row is marked by the
-- `internal` flag: immutable name, never disableable.
CREATE TABLE "catalog_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"attribution" text,
	"internal" boolean DEFAULT false NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "catalog_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "source_id" uuid;
--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_source_id_catalog_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "catalog_sources"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
-- Seed the built-in Internal / Interne source (immutable name, never
-- disableable): every catalog record created through the application
-- binds it; the UI renders its badge through the i18n catalogs.
INSERT INTO "catalog_sources" ("name", "internal") VALUES ('Internal', true);
--> statement-breakpoint
-- Backfill: catalog-type records created before this migration were
-- DM-authored — their provenance is the Internal source. The type list
-- mirrors catalogTypes (packages/schemas) and is drift-guarded by a
-- test (catalog-sources spec → migration types match the registry).
UPDATE "entities" SET "source_id" = (SELECT "id" FROM "catalog_sources" WHERE "internal")
WHERE "type" IN ('classes', 'species', 'conditions', 'fauna', 'flora', 'languages', 'damage-types', 'treasure-types');

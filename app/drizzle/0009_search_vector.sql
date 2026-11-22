-- Full-text search foundation (full-text-search capability, round 1 of
-- search-and-catalogs). ONE fixed text-search configuration for all
-- content (PRE-SPEC §2 decision of 2026-11-09): `simple` extended with
-- `unaccent` so French and English records match accent-insensitively
-- — no stemming, no content-language setting. The vector is maintained
-- by the application service on every write (title weighted A, the
-- template-declared text field values weighted B) and GIN-indexed; no
-- DB trigger, the indexed field set is template-driven.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION simple_unaccent (COPY = simple);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION simple_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple;
--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "search_vector" tsvector;
--> statement-breakpoint
CREATE INDEX "entities_search_vector_idx" ON "entities" USING gin ("search_vector");
--> statement-breakpoint
-- Backfill: the same extraction the service applies on every write —
-- title weighted A, the prose field values weighted B. The key list
-- mirrors proseFieldKeys (packages/schemas) and is drift-guarded by a
-- test (search-index.test.ts → migration keys match the registry).
UPDATE "entities" SET "search_vector" =
  setweight(to_tsvector('simple_unaccent', "title"), 'A') ||
  setweight(to_tsvector('simple_unaccent', coalesce((
    SELECT string_agg("value", E'\n')
    FROM jsonb_each_text("fields")
    WHERE "key" IN ('physical_traits', 'public_description', 'private_description', 'dm_summary', 'traits', 'actions', 'bonus_actions', 'reactions', 'legendary_actions', 'running_notes', 'pitch', 'characteristics', 'commerce')
  ), '')), 'B');

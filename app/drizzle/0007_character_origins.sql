UPDATE "relationships" SET "kind" = 'origins' WHERE "kind" = 'origin' AND "from_id" IN (SELECT "id" FROM "entities" WHERE "type" = 'characters-and-entities');
DROP INDEX IF EXISTS "relationships_one_ref_uq";
CREATE UNIQUE INDEX "relationships_one_ref_uq" ON "relationships" USING btree ("from_id","kind") WHERE kind in ('campaign', 'chapter', 'capital', 'headquarters', 'origin');

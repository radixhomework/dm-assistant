-- A target may be attached only once per field: exact duplicate
-- (from_id, kind, to_id) triples are the residue of the check-then-insert
-- race the application guard could not close — collapse them (the rows
-- carry identical information) before the database starts refusing them.
DELETE FROM "relationships" AS "duplicate"
USING "relationships" AS "kept"
WHERE "duplicate"."from_id" = "kept"."from_id"
  AND "duplicate"."kind" = "kept"."kind"
  AND "duplicate"."to_id" = "kept"."to_id"
  AND "duplicate"."id" > "kept"."id";
CREATE UNIQUE INDEX "relationships_target_uq" ON "relationships" USING btree ("from_id","kind","to_id");

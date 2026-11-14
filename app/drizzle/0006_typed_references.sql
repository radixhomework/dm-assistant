DROP INDEX "relationships_child_role_uq";
UPDATE "relationships" SET "kind" = 'campaign' WHERE "kind" = 'chapter';
UPDATE "relationships" SET "kind" = 'chapter' WHERE "kind" = 'scene';
CREATE UNIQUE INDEX "relationships_one_ref_uq" ON "relationships" USING btree ("from_id","kind") WHERE kind in ('campaign', 'chapter', 'origin', 'capital', 'headquarters');

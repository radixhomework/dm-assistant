CREATE TABLE "mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"target_slug" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mentions_entity_idx" ON "mentions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "mentions_target_idx" ON "mentions" USING btree ("target_slug");
-- Trigram support for the title autocomplete (PRE-SPEC.md §6).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "entities_title_trgm_idx" ON "entities" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "entities_slug_trgm_idx" ON "entities" USING gin ("slug" gin_trgm_ops);

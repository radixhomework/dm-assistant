import { z } from "zod";
import { slugSchema } from "./entities.js";
import { catalogTypes } from "./templates/index.js";

/** Catalog provenance sources (srd-catalog-import capability): the
 * built-in Internal source is seeded by migration 0010 and carries no
 * client-facing creation path — administrators create, rename and
 * disable named external sources only. */

export const createSourceSchema = z.object({
  name: z.string().min(1).max(120),
  attribution: z.string().max(1000).optional(),
});
export type CreateSourceInput = z.infer<typeof createSourceSchema>;

/** Rename, attribution note and the disable toggle; the built-in
 * Internal source refuses every update server-side (immutable,
 * non-disableable). */
export const updateSourceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  attribution: z.string().max(1000).nullable().optional(),
  disabled: z.boolean().optional(),
});
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;

export const sourceIdSchema = z.uuid();

/** The source-scoped purge (srd-catalog-import): the sanctioned
 * removal channel for imported records. The preview lists the records
 * one catalog carries under one source; the confirm deletes the
 * accepted slugs in one transaction. Disabled sources participate —
 * a retired import's data still leaves through the purge. */
export const purgeQuerySchema = z.object({
  catalog: z.enum(catalogTypes),
  sourceId: z.uuid(),
});
export const purgeConfirmSchema = purgeQuerySchema.extend({
  slugs: z.array(slugSchema).min(1),
});
export type PurgeQueryInput = z.infer<typeof purgeQuerySchema>;
export type PurgeConfirmInput = z.infer<typeof purgeConfirmSchema>;

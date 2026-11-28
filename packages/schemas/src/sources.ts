import { z } from "zod";

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

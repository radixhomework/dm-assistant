import { z } from "zod";

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits and dashes");

export const perimeters = ["world", "campaign"] as const;
export type Perimeter = (typeof perimeters)[number];

export const createEntitySchema = z.object({
  slug: slugSchema,
  type: z.string().min(1).max(80),
  perimeter: z.enum(perimeters),
  title: z.string().min(1).max(200),
  tags: z.array(z.string().min(1).max(60)).default([]),
  fields: z.record(z.string(), z.unknown()).default({}),
});

export const updateEntitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  tags: z.array(z.string().min(1).max(60)).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

/** Tag management actions (record-tags capability, admin only): rename
 * rewrites every record carrying the tag, merge absorbs it into a
 * target. Both normalize their inputs server-side. */
export const renameTagSchema = z.object({
  from: z.string().min(1).max(60),
  to: z.string().min(1).max(60),
});
export const mergeTagSchema = z.object({
  from: z.string().min(1).max(60),
  into: z.string().min(1).max(60),
});
export type RenameTagInput = z.infer<typeof renameTagSchema>;
export type MergeTagInput = z.infer<typeof mergeTagSchema>;

export const parentSchema = z.object({
  parentSlug: slugSchema,
  /** The child's reference field pointing at its parent: a chapter's
   * `campaign`, a scene's `chapter` (records-editor decision 8). */
  kind: z.enum(["campaign", "chapter"]),
});

export const attachReferenceSchema = z.object({
  targetSlug: slugSchema,
});
export type AttachReferenceInput = z.infer<typeof attachReferenceSchema>;

/** Play-order move: swaps a child with its previous/next sibling. */
export const moveSchema = z.object({
  direction: z.enum(["up", "down"]),
});
export type MoveInput = z.infer<typeof moveSchema>;

export const playStatuses = ["not_played", "in_progress", "played"] as const;
export type PlayStatus = (typeof playStatuses)[number];

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;

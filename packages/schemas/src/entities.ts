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

export const parentSchema = z.object({
  parentSlug: slugSchema,
  kind: z.enum(["chapter", "scene"]),
});

export const playStatuses = ["not_played", "in_progress", "played"] as const;
export type PlayStatus = (typeof playStatuses)[number];

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;

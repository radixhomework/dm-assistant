/**
 * Template schema factory: the shared shape every per-template file uses.
 * 
 * template() wraps a strict fields object (validated against the fields
 * JSONB) plus reference declarations — references live in the
 * relationships table with kind equal to their field key, never in the
 * fields JSONB. catalogSchema() derives the shared catalog body.
 */

import { z } from "zod";
import { assetReferenceSchema } from "./vocabulary.js";
import { statisticsSchema } from "./statistics.js";

export const referenceCardinalities = ["one", "many"] as const;
export type ReferenceCardinality = (typeof referenceCardinalities)[number];

export type ReferenceDeclaration = {
  target: string;
  cardinality: ReferenceCardinality;
};

export type TemplateSchema = {
  /** Field validation: applies to the `fields` JSONB (references excluded). */
  fields: z.ZodType;
  /** Reference fields: rendered from the relationships table, key → target. */
  references: Record<string, ReferenceDeclaration>;
};

export const proseField = z.string().optional();
export const assetField = assetReferenceSchema.optional();

/**
 * Builds a template schema: strict fields object + reference declarations.
 * All template fields are optional (no required field, PRE-SPEC §5 rule 6).
 */
export function template(
  fields: Record<string, z.ZodType>,
  references: Record<string, ReferenceDeclaration> = {},
): TemplateSchema {
  return { fields: z.object(fields).strict(), references };
}

export const refOne = (target: string): ReferenceDeclaration => ({
  target,
  cardinality: "one",
});
export const refMany = (target: string): ReferenceDeclaration => ({
  target,
  cardinality: "many",
});

/** Catalog body: Pitch, [Statistics], Public description, Private description. */
/**
 * Builds the shared catalog body; withStatistics embeds the Statistics
 * block (fauna and flora only).
 */
export function catalogSchema(withStatistics: boolean): TemplateSchema {
  const fields: Record<string, z.ZodType> = {
    pitch: z.string().optional(),
    public_description: proseField,
    private_description: proseField,
  };
  if (withStatistics) {
    fields.statistics = statisticsSchema.optional();
  }
  return template(fields);
}

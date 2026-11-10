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

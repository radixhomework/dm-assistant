/**
 * "Equipment and items" template schema — world perimeter (Game system category).
 * 
 * Source of truth: templates/world/game-system/equipment-and-items.md.
 * value is currency-aware money (GP/SP/CP, factor 10 between each);
 * weight and level are free numeric strings in the world's units.
 */

import { z } from "zod";
import { assetField, proseField, template } from "../factory.js";
import { moneySchema, numericStringSchema } from "../vocabulary.js";
import { rarityValues, sizeValues } from "../statistics.js";

export const equipmentAndItems = template(
  {
    illustration: assetField,
    value: moneySchema.optional(),
    weight: numericStringSchema.optional(),
    size: z.enum(sizeValues).optional(),
    rarity: z.enum(rarityValues).optional(),
    level: numericStringSchema.optional(),
    public_description: proseField,
    private_description: proseField,
  },
);

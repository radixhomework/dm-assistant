/**
 * "Monsters" template schema — world perimeter (Bestiary category).
 * 
 * Source of truth: templates/world/bestiary/monsters.md. Traits and
 * actions are free prose; every mechanical value belongs to the statistics
 * block (charter rule 6: mechanical fields are never invented).
 */

import { assetField, proseField, refMany, template } from "../factory.js";
import { statisticsSchema } from "../statistics.js";

export const monsters = template(
  {
    illustration: assetField,
    statistics: statisticsSchema.optional(),
    traits: proseField,
    actions: proseField,
    bonus_actions: proseField,
    public_description: proseField,
    private_description: proseField,
  },
  {
    languages: refMany("languages"),
    treasure_types: refMany("treasure-types"),
  },
);

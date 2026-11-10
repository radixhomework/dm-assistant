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

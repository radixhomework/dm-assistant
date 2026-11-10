import { z } from "zod";
import { assetField, proseField, refMany, refOne, template } from "../factory.js";
import { statisticsSchema } from "../statistics.js";

export const charactersAndEntities = template(
  {
    illustration: assetField,
    gender: z.enum(["male", "female", "nonbinary"]).optional(),
    physical_traits: proseField,
    statistics: statisticsSchema.optional(),
    public_description: proseField,
    private_description: proseField,
  },
  {
    origin: refOne("places"),
    species: refMany("species"),
    classes: refMany("classes"),
    languages: refMany("languages"),
    characters: refMany("characters-and-entities"),
    beliefs: refMany("beliefs-myths-and-customs"),
    organizations: refMany("organizations"),
    knowledge: refMany("knowledge-and-technologies"),
    works: refMany("works"),
  },
);

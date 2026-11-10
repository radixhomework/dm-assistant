import { z } from "zod";
import { assetField, proseField, refMany, refOne, template } from "../factory.js";
import { numericStringSchema } from "../vocabulary.js";

export const nations = template(
  {
    illustration: assetField,
    population: numericStringSchema.optional(),
    political_system: z
      .enum([
        "anarchy",
        "aristocracy",
        "autocracy",
        "confederation",
        "diarchy",
        "empire",
        "matriarchy",
        "militocracy",
        "monarchy",
        "oligarchy",
        "patriarchy",
        "republic",
        "tribal_system",
        "theocracy",
        "timocracy",
        "triarchy",
      ])
      .optional(),
    public_description: proseField,
    private_description: proseField,
  },
  {
    capital: refOne("places"),
    geography: refMany("places"),
    beliefs: refMany("beliefs-myths-and-customs"),
    works: refMany("works"),
    knowledge: refMany("knowledge-and-technologies"),
    languages: refMany("languages"),
    characters: refMany("characters-and-entities"),
    organizations: refMany("organizations"),
    events: refMany("events"),
  },
);

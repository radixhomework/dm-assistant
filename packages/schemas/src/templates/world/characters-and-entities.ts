/**
 * "Characters and entities" template schema — world perimeter (Characters category).
 * 
 * Source of truth: templates/world/characters/characters-and-entities.md.
 * The statistics field carries the reusable SRD-shaped block. Reference
 * values (origin, species, classes, languages and the association lists)
 * live in the relationships table keyed by field, never in fields JSONB.
 */

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

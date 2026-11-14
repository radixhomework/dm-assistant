/**
 * "Beliefs, myths and customs" template schema — world perimeter (Culture category).
 * 
 * Source of truth: templates/world/culture/beliefs-myths-and-customs.md.
 */

import { assetField, proseField, refMany, refOne, template } from "../factory.js";
import { numericStringSchema } from "../vocabulary.js";

export const beliefsMythsAndCustoms = template(
  {
    illustration: assetField,
    follower_count: numericStringSchema.optional(),
    public_description: proseField,
    private_description: proseField,
  },
  {
    origin: refOne("places"),
    events: refMany("events"),
    characters: refMany("characters-and-entities"),
    organizations: refMany("organizations"),
    beliefs: refMany("beliefs-myths-and-customs"),
  },
);

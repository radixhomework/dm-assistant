/**
 * "Organizations" template schema — world perimeter (Society category).
 * 
 * Source of truth: templates/world/society/organizations.md. member_count
 * is a free numeric string (single or approximate figure).
 */

import { assetField, proseField, refMany, refOne, template } from "../factory.js";
import { numericStringSchema } from "../vocabulary.js";

export const organizations = template(
  {
    illustration: assetField,
    member_count: numericStringSchema.optional(),
    public_description: proseField,
    private_description: proseField,
  },
  {
    headquarters: refOne("places"),
    leaders: refMany("characters-and-entities"),
    characters: refMany("characters-and-entities"),
    organizations: refMany("organizations"),
    events: refMany("events"),
  },
);

/**
 * "Places" template schema — world perimeter (Geography category).
 * 
 * Source of truth: templates/world/geography/places.md. place_type holds
 * the Place type enum (intangible place, locality, city); population is a
 * free numeric string entered in the world's units.
 */

import { z } from "zod";
import { assetField, proseField, refMany, template } from "../factory.js";
import { numericStringSchema } from "../vocabulary.js";

export const places = template(
  {
    illustration: assetField,
    place_type: z.enum(["intangible_place", "locality", "city"]).optional(),
    population: numericStringSchema.optional(),
    public_description: proseField,
    private_description: proseField,
  },
  {
    leaders: refMany("characters-and-entities"),
    nations: refMany("nations"),
    characters: refMany("characters-and-entities"),
    events: refMany("events"),
  },
);

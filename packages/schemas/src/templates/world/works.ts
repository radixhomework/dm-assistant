/**
 * "Works" template schema — world perimeter (Culture category).
 * 
 * Source of truth: templates/world/culture/works.md.
 */

import { assetField, proseField, refMany, refOne, template } from "../factory.js";

export const works = template(
  {
    illustration: assetField,
    public_description: proseField,
    private_description: proseField,
  },
  {
    origin: refOne("places"),
    events: refMany("events"),
    characters: refMany("characters-and-entities"),
    organizations: refMany("organizations"),
  },
);

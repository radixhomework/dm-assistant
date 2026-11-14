/**
 * "Knowledge and technologies" template schema — world perimeter (Culture category).
 * 
 * Source of truth: templates/world/culture/knowledge-and-technologies.md.
 */

import { assetField, proseField, refMany, refOne, template } from "../factory.js";

export const knowledgeAndTechnologies = template(
  {
    illustration: assetField,
    public_description: proseField,
    private_description: proseField,
  },
  {
    origin: refOne("places"),
    events: refMany("events"),
    places: refMany("places"),
    characters: refMany("characters-and-entities"),
    knowledge: refMany("knowledge-and-technologies"),
    nations: refMany("nations"),
    beliefs: refMany("beliefs-myths-and-customs"),
  },
);

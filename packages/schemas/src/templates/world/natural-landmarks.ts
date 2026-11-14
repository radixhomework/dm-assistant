/**
 * "Natural landmarks" template schema — world perimeter (Geography category).
 * 
 * Source of truth: templates/world/geography/natural-landmarks.md.
 */

import { assetField, proseField, refMany, template } from "../factory.js";

export const naturalLandmarks = template(
  {
    illustration: assetField,
    public_description: proseField,
    private_description: proseField,
  },
  {
    nations: refMany("nations"),
  },
);

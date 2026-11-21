/**
 * "Game rules" template schema — world perimeter (Game system category).
 * 
 * Source of truth: templates/world/game-system/game-rules.md. A rule is
 * never secret: public description only, no private counterpart.
 */

import { proseField, template } from "../factory.js";

export const gameRules = template({
  public_description: proseField,
});

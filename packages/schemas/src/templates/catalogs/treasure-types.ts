/**
 * "Treasure types" catalog schema — the target of the Monsters
 * treasure_types reference field.
 * 
 * Source of truth: templates/catalogs/treasure-types.md.
 */

import { catalogSchema } from "../factory.js";

export const treasureTypes = catalogSchema(false);

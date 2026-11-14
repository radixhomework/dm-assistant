/**
 * "Damage types" catalog schema — the target of the Statistics block's
 * vulnerabilities / resistances / immunities reference lists.
 * 
 * Source of truth: templates/catalogs/damage-types.md.
 */

import { catalogSchema } from "../factory.js";

export const damageTypes = catalogSchema(false);

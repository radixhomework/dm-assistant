/**
 * "Flora" catalog schema — one of the two catalogs embedding the
 * Statistics block (with fauna).
 * 
 * Source of truth: templates/catalogs/flora.md. SRD-imported catalog
 * records are non-editable, DM-created ones are editable.
 */

import { catalogSchema } from "../factory.js";

export const flora = catalogSchema(true);

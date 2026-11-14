/**
 * "Fauna" catalog schema — one of the two catalogs embedding the
 * Statistics block (with flora).
 * 
 * Source of truth: templates/catalogs/fauna.md. SRD-imported catalog
 * records are non-editable, DM-created ones are editable.
 */

import { catalogSchema } from "../factory.js";

export const fauna = catalogSchema(true);

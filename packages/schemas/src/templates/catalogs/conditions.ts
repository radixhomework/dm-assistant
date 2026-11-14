/**
 * "Conditions" catalog schema.
 * 
 * Catalogs share the Pitch / Public description / Private description body;
 * SRD-imported catalog records are non-editable, DM-created ones are
 * editable.
 * 
 * Source of truth: templates/catalogs/conditions.md.
 */

import { catalogSchema } from "../factory.js";

export const conditions = catalogSchema(false);

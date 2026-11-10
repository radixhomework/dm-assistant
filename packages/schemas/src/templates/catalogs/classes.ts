/**
 * "Classes" catalog schema.
 * 
 * Catalogs share the Pitch / Public description / Private description body
 * (fauna and flora add the Statistics block); SRD-imported catalog records
 * are non-editable, DM-created ones are editable.
 * 
 * Source of truth: templates/catalogs/classes.md.
 */

import { catalogSchema } from "../factory.js";

export const classes = catalogSchema(false);

/**
 * "Languages" catalog schema.
 * 
 * Catalogs share the Pitch / Public description / Private description body;
 * SRD-imported catalog records are non-editable, DM-created ones are
 * editable.
 * 
 * Source of truth: templates/catalogs/languages.md.
 */

import { catalogSchema } from "../factory.js";

export const languages = catalogSchema(false);

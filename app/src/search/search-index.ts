import { sql, type SQL } from "drizzle-orm";
import { proseFieldKeys } from "@dm/schemas";

/**
 * Search-index extraction (full-text-search capability): the indexed
 * text of a record is its title plus the string values of its
 * template-declared text fields (prose and short-text keys — today the
 * registry marks every one of them in `proseFieldKeys`, the same set the
 * mention scanner uses). Non-text values (numbers, money, dates, enums,
 * references, asset refs, play statuses) are never indexed, and neither
 * is the structured Statistics block.
 *
 * The vector is computed IN SQL from those values (see
 * `buildSearchVector`) with the ONE fixed `simple_unaccent`
 * configuration (PRE-SPEC §2 decision of 2026-11-09): title weighted A,
 * field text weighted B, so title matches rank above field matches.
 */

/** The prose + short-text field values of a record, joined by newlines
 * (field-key order — irrelevant for matching, the B weight is uniform).
 * Pure function — shared by the write path (entities service), the
 * headline rendering (search service) and the migration drift guard. */
export function extractSearchableText(fields: unknown): string {
  const record = (fields ?? {}) as Record<string, unknown>;
  return Object.entries(record)
    .filter(
      ([key, value]) =>
        proseFieldKeys.has(key) && typeof value === "string" && value.length > 0,
    )
    .map(([, value]) => value as string)
    .join("\n");
}

/**
 * The tsvector fragment for a record write: title weighted A, the
 * record's text field values weighted B, both lexized through the fixed
 * `simple_unaccent` configuration. Pass the extracted text from
 * `extractSearchableText` (empty string is fine — the weighted concat
 * degrades to the title alone).
 */
export function buildSearchVector(title: string, fieldsText: string): SQL {
  return sql`setweight(to_tsvector('simple_unaccent', ${title}), 'A') || setweight(to_tsvector('simple_unaccent', ${fieldsText}), 'B')`;
}

/**
 * Stable API error codes (PRE-SPEC §1): the backend never returns a
 * formatted human message — the client translates the code through its
 * i18n catalogs (`errors.<code>`). The list is the contract; a code
 * emitted by the backend must appear here.
 */

export const errorCodes = [
  // Entities: template validation, search query parsing.
  "fields_invalid",
  "invalid_query",
  // Catalog provenance (srd-catalog-import): registry invariants and
  // the imported-record read-only guard.
  "source_immutable",
  "source_name_taken",
  "source_not_allowed",
  "source_readonly",
  // Catalog import: origin handling (file/URL) and dataset validation.
  "import_invalid_payload",
  "import_url_refused",
  "import_endpoint_unreachable",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
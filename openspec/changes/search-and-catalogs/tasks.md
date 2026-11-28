Implementation rounds — one branch per round, merged to main at round end (branches live days, not the whole phase): **R1** `feat/search-foundations` = groups 1, 2, 9 · **R2** `feat/record-tags` = groups 3, 10 · **R3** `feat/catalog-sources-import` = groups 4, 5, 8.1–8.2, 11 · **R4** `feat/external-references` = groups 7, 8.3, 12 · **R5** `feat/gap-inventory` = groups 6, 13, 14. Each round ships its own migration and keeps main deployable; the change is archived after R5.

## 1. Database and shared foundation

- [x] 1.1 Drizzle migration (round 1): `CREATE EXTENSION IF NOT EXISTS unaccent`, create the `simple_unaccent` text-search configuration, add `entities.search_vector tsvector` with GIN index — verify with a migration test on a fresh database
- [x] 1.2 Shared text-field extraction helper in `app/src/search/` (prose + short-text string values from `fields`, driven by the `packages/schemas` registry) and `buildSearchVector(record)` (weighted title A / fields B, `simple_unaccent` config) with unit tests — accent folding covered (`ecole` → `École`)
- [x] 1.3 Backfill `search_vector` for existing records in the round-1 migration through the shared helper — verify by running the migration on a seeded database and asserting vectors match freshly computed ones

## 2. Full-text search backend

- [x] 2.1 Search service: query path (`search_vector @@ websearch_to_tsquery` OR title ILIKE), type and tag filters, `ts_rank` ordering with ILIKE-only matches appended, `ts_headline` snippets with explicit delimiters — unit tests over the acceptance scenarios (accent-insensitive, field-content match, non-text not matched, ranked results, filters, empty result)
- [x] 2.2 REST endpoint `GET /api/search?q=&type=&tag=` with auth guard, stable response shape (slug, title, type, perimeter, tags, snippet) — controller tests for auth, filters and empty-query behavior
- [x] 2.3 Wire vector maintenance into the entities service create/update paths (same transaction, helper reuse) and verify with service tests: fresh saves are searchable, removed text no longer matches

## 3. Tags backend

- [x] 3.1 Tag normalization in the entities service (trim, lowercase, collapse internal whitespace, drop empties, dedupe) with unit tests covering the `Forêt`/`forêt` dedup case
- [x] 3.2 Tag inventory endpoint `GET /api/tags` (distinct tags with record counts, alphabetical, authenticated for all DM accounts — feeds filters, completions and the admin Tags tab) — controller test asserting counts and ordering
- [x] 3.3 Admin tag management endpoints: rename (instance-wide rewrite with dedup pass) and merge (absorb into a target tag, dedup, one transaction, touched-record count reported) — service tests for rename propagation, the both-tags-present dedup case and merge; controller tests for admin gating

## 4. Named sources and non-editability backend

- [x] 4.1 Drizzle migration (round 3): create `catalog_sources` (seeded with the built-in Internal / Interne source) and add `entities.source_id` FK — verify with a migration test on a fresh database
- [ ] 4.2 Source registry service + endpoints: create/rename/disable external sources (admin only), built-in Internal source immutable and non-disableable, list for import selection and badges — controller tests for admin gating and the Internal invariants
- [ ] 4.3 `source` binding in the entities service: catalog-type creation always binds the Internal source (client-supplied source refused), source immutable on update, entity responses carry the source (id, name, internal/external) — service tests for the default and the immutability
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:6eb03d62f7cec70b9768ad2d6d066967bfa0f16c1be9ff3b4aedb9a69ee6e438 -->

- [ ] 4.4 Source-data read-only guard in the service: source-derived field updates, per-record tag updates and deletion rejected for catalog records bound to an external source, DM-authored fields (Pitch, Private description) stay editable, stable error code, Internal records unaffected — service tests for each case

<!-- /coderabbit-ai-generated:v1 -->
- [ ] 4.5 Error codes added to the stable-codes list and translated in both i18n catalogs — verify the fr and en entries exist

## 5. Open5e import service and admin UI

- [ ] 5.1 Open5e shape schemas + mappers in `packages/schemas` (object shape: `name`, `key`/`slug`, `descriptions[]`/`desc`; bare array or paginated envelope accepted; mapping name → title, key → slug, document descriptions → Public description, Pitch/Private untouched) with tests rejecting malformed elements — export and document against Open5e v2 (`srd-2024`)
- [ ] 5.2 Unit-conversion helper `convertSrdUnits` in `packages/schemas` (barème: 5 ft = 1.5 m · 1 mile = 1.5 km · 1 lb = 500 g · 1 gal = 4 l; identity when the world uses imperial) with conversion tests — verify fractional results stay exact (30 ft → 9 m)
- [ ] 5.3 Import service with dry-run/confirm protocol: parse → validate → map → match by slug → preview classification (new / same-source overwrite pre-checked / different-provenance conflict opt-in with rebind on confirm / slug-collision skipped with reasons); confirm executes one transactional write of the accepted set with unit conversion and a created/updated/skipped report — service tests for each preview class, the never-blocked behavior and transactional execution
- [ ] 5.4 Admin-only import endpoint: file upload (multipart, size cap) and endpoint URL modes (server-side HTTPS fetch, private-address refusal, pagination page cap) — controller tests for admin gating, SSRF refusal and envelope pagination
- [ ] 5.5 Import catalogs tab in the admin panel: origin picker (file/URL), catalog + source selection, preview list with per-item checkboxes, select-all control and skip reasons, confirm + report display — component tests for the preview classes, the select-all behavior and the confirm flow
- [ ] 5.6 `docs/srd-import.md` documenting the Open5e format, mapping, endpoint examples (`document=srd-2024`), matching rules and the UI flow (human action, charter rule 6) — verify the documented example passes the shape schemas

## 6. Gap inventory backend

- [ ] 6.1 Marker detection service in `app/src/audit/` (case-sensitive regex `\[TO BE SPECIFIED(?::[^\]]*)?\]` over prose/short-text values, reuse of the extraction helper) with unit tests for annotated, bare and non-marker bracketed text
- [ ] 6.2 Inventory endpoint `GET /api/gaps?type=` returning markers grouped by record with field label, note and counts — controller tests for grouping, type filter and empty inventory

## 7. External references backend

- [ ] 7.1 Drizzle migration (round 4): create `external_sources` and `external_refs` (ARCHITECTURE §5 shape) — verify with a migration test on a fresh database
- [ ] 7.2 Sources + entries service and endpoints: source CRUD (admin), entry CRUD (admin) with URL-template prefill, bulk JSON import per source (update same-kind+name, create otherwise, never delete, report), DM-wide read endpoint (list/search with source, kind, name filters; disabled sources excluded) — controller and service tests for each rule
- [ ] 7.3 Reference-entry JSON schema in `packages/schemas` + badge-matching service (accent/case-insensitive exact title match) — unit tests for matching, disabled-source exclusion and the import format; `docs/external-references.md` documents the format

## 8. Admin panel tabs

- [ ] 8.1 Reorganize AdminPage into tabs — Users, Instance, Calendar, Import catalogs, External references, Tags — with client-side tab navigation on the admin route, admin gating unchanged — component tests for tab rendering, access denial for `dm` accounts and content preservation
- [ ] 8.2 Tags tab: inventory view (tag, count, records linking to their pages) + rename and merge actions with confirmation and touched-record report — component tests for the view, the actions and the admin-only gating
- [ ] 8.3 External references tab: sources management (create/edit/disable with URL template) and entries management (create with template prefill, edit, delete, bulk JSON import with report) — component tests for the CRUD flows and the import report

## 9. Search UI

- [x] 9.1 Header search entry in `RootLayout` (i18n labels fr/en) leading to `/search` with the query field focused — component test for entry visibility and navigation
- [x] 9.2 Search results page: results with category label, tags and snippet highlighting via React node splitting (no `dangerouslySetInnerHTML`), type and tag filters wired to the endpoint, navigation to record pages — component tests for rendering, filtering and navigation; empty-query and no-result states
- [x] 9.3 E2E acceptance: save a record containing `École` in a prose field, search `ecole`, assert the record appears — automated where the e2e harness allows, manual checklist otherwise

## 10. Tags UI

- [x] 10.1 Tags section in the record edit form (system section, completion suggestions from the tag inventory, draft rules of the edit session) — component tests for save, normalization display and suggestion behavior
- [x] 10.2 Tag chips on record sheets (hidden when no tags) — component test for both states
- [x] 10.3 Tag filter on the Lore page (combining with category browsing) and on the search results page — component tests for filtered listings

## 11. Source badge and attribution UI

- [ ] 11.1 Source badge on catalog sheets (source name; Internal badge for internal records; external badges leading to `/attribution`), none on non-catalog records — component tests for the internal, external and null cases
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:76ee533e36a7181743eb2c8e610a47d621007d00a5cabf999b40a3175a7cfe6c -->

- [ ] 11.2 Imported-record sheet: edit Pitch and Private description only; no tag editing or deletion — component test for the imported vs internal sheet

<!-- /coderabbit-ai-generated:v1 -->
- [ ] 11.3 Attribution page at `/attribution` (fixed WotC SRD 5.2 CC-BY-4.0 statement + the instance's external sources with their attribution notes, fr/en labels) linked from the settings screen — component test for reachability and content

## 12. External references UI

- [ ] 12.1 Reference badges on record sheets (source-labeled, accent-insensitive title match, new-tab links, none when no match) — component tests for the match, the accent case and the empty case
- [ ] 12.2 Reference button in the editor toolbar opening the lookup panel (search + source/kind filters, links open in a new tab, nothing inserted into content) — component tests for opening, filtering and the lookup-only behavior

## 13. Gap inventory UI

- [ ] 13.1 Lore page link to `/gaps` showing the pending count — component test for the link and count
- [ ] 13.2 Inventory page: markers grouped by record with field label and note, type filter, entries navigating to record pages, empty state — component tests for listing, navigation and the empty state

## 14. Integration verification

- [ ] 14.1 Full suite green: backend tests, web tests, build checks — `pnpm test` and CI green
- [ ] 14.2 Phase exit criteria walkthrough on a dev instance: accent-insensitive search (`ecole` → `École`), an Open5e endpoint import populates the catalogs with named-source badges and read-only sheets (preview identifies overwrites, select-all works), tag edit/filter/browse + admin rename/merge, a reference import produces badges on matching sheets and the Reference panel opens from the editor, inventory lists a marker and clears after the DM edits it

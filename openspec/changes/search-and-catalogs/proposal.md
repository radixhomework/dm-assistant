## Why

Phase 3 of the ROADMAP ("Search & catalogs") turns the record store built in P1–P2 into a usable lore base: records are only as valuable as they are findable, the 8 SRD catalogs are still empty shells the DM must fill by hand, tags exist as a database column but have no surface, and the `[TO BE SPECIFIED: …]` markers the charter makes central are written by the DM but never inventoried by the application. The phase's exit criteria: **accent-insensitive search works; catalogs populated and browsable**.

This change also settles the decisions PRE-SPEC §2 deferred to "the P3 search change": the exact text-search dictionary and — surfaced during planning — what the search vector actually indexes, since the record-editor change removed the generic `body` field PRE-SPEC still references ("trigger-maintained from `title` + `body`"). Search indexes `title` + the template-declared **text field values** (prose and short-text) extracted from `fields`; there is no body.

Revised after DM review: the import moves from a CLI script to a web UI inside a tabbed admin panel, catalog provenance becomes a registry of named sources (not a fixed enum), the import previews matches before overwriting, and the dataset format follows Open5e for interoperability.

## What Changes

- **Full-text search** over all records (world and campaign): Postgres `tsvector` with one fixed text-search configuration (`simple` + `unaccent` always applied — the single-configuration decision of 2026-11-09), maintained on write from title + text field values; a search API (query, type filter, tag filter); a search UI reachable from a shell-header entry point, with type and tag filters. Accent-insensitive by construction (`ecole` finds `École`).
- **Record tags** surface: tag editing on the record edit form (system section, not a template field — the `entities.tags` column already exists), tags displayed on record sheets, a tag inventory endpoint (distinct tags with counts, feeding the filters and completions), tag filtering on the Lore page and in search results, and an admin **Tags tab with tag management** (rename or merge a tag across every record carrying it). This prepares the MCP `list_tags()` tool delivered in P5.
- **Catalog import through a web UI**: the admin panel is reorganized into tabs (Users / Instance / Calendar / Import catalogs / External references / Tags) and gains an import page accepting either a **local JSON file upload** or an **API endpoint URL** (fetched server-side). The dataset format follows **Open5e** (v2 object shape) for interoperability; the target catalog and the source are selected in the UI. The flow is **preview-before-import**: fetch/parse/validate → preview listing new elements and existing elements that will be overwritten (select-all control on the checkboxes) → DM confirms → transactional execution with a report. The import is never blocked by same-name elements.
- **External references** (PRODUCT §3.5, folded into this change after roadmap review): a local catalogue of deep links (aidedd.org, 5e.tools, …) grouped by source and kind, managed by an administrator (manual entries with URL-template prefill + bulk JSON import) and surfaced two ways — source-labeled badges on record sheets when an entry's name matches the record's title (accent-insensitive), and a distinct **Reference** button in the editor opening a lookup-only catalogue panel. The application links, it never copies external content (GOVERNANCE §4).
- **Named catalog sources**: catalog records carry a source from a registry the DM manages — the built-in **Internal / Interne** source for manually created records, and as many named external sources as the DM wants (e.g. "Open5e (SRD 5.2)"). Sources carry an optional attribution note displayed on the attribution page. Records imported from an external source are **non-editable** (no update, no delete from the app — only a re-import refreshes them); internal records stay editable. Unit conversion (imperial → world units, factor barème) happens once at import. The Wizards of the Coast attribution page (GOVERNANCE §4 obligation) shows the fixed SRD 5.2 CC-BY-4.0 statement plus the instance's sources.
- **`[TO BE SPECIFIED]` inventory**: detection of pending markers in record field values, a queryable inventory API (filter by template type), and an inventory page (reachable from the Lore page) listing pending markers grouped by record. The audit module hosts it (ARCHITECTURE §4); the rest of the audit (dead links, orphans, template violations) and the MCP `list_missing()` tool remain P5.
- **ROADMAP fix**: the external-references feature was missing from every phase; the P3 row now names it, delivered by this change.

## Capabilities

### New Capabilities
- `full-text-search`: accent-insensitive full-text search over records (index content, API, search UI with filters).
- `record-tags`: tag editing, display, inventory, filtering, and the admin Tags tab with rename/merge management.
- `srd-catalog-import`: named catalog sources, non-editability of imported records, the Open5e-format import UI with preview, unit conversion, attribution page.
- `external-references`: deep-link catalogue (sources, entries, admin management + bulk import), render-time badges, distinct Reference channel.
- `gap-inventory`: detection and queryable inventory of pending `[TO BE SPECIFIED: …]` markers.

### Modified Capabilities

- `accounts-and-admin`: the admin panel is reorganized into tabs — Users, Instance, Calendar (existing content moved) plus the new Import catalogs and Tags tabs — with access rules unchanged (admin only).

## Impact

- **Database**: `entities` gains `search_vector tsvector` (indexed, maintained on write in the application service — no DB trigger, the indexed field set is template-driven via the schema registry) and `source_id` (nullable FK to the new `catalog_sources` table — catalog records only); new `catalog_sources` table (id, name, attribution, seeded with Internal) and the ARCHITECTURE §5 `external_sources` / `external_refs` tables for the deep-link catalogue; migration + backfill of `search_vector` for existing records.
- **Backend**: `search` module (query service + REST endpoint), `audit` module (marker detection + inventory endpoint), `external-refs` module (sources/entries CRUD, bulk import, badge matching), entities service (source binding, tag normalization, admin tag rename/merge), an import service + admin-only import endpoint (file parse or server-side URL fetch with SSRF guards), Open5e mapping layer in `packages/schemas`.
- **Frontend**: search entry point in the shell header + results page; tags section in the edit form and sheets; tag filter on the Lore page; gaps page linked from the Lore page; source badge (source name) on catalog sheets; external-reference badges on sheets; Reference button + lookup panel in the editor; attribution credits page; admin panel tabbed reorganization with the new Import catalogs, External references and Tags tabs. All new labels in fr + en i18n catalogs.
- **Dependencies**: none new beyond what Postgres already ships (`unaccent`, `pg_trgm` already planned); the Open5e mapping and the reference-import format are validated with Zod in `packages/schemas`.
- **Docs**: `docs/srd-import.md` documents the Open5e format, mapping, endpoint and flow; `docs/external-references.md` documents the reference-entry JSON format; ROADMAP P3 names the external-references deliverable; ARCHITECTURE §7 import wording ("manual script") is updated to the admin UI (human action, charter rule 6, unchanged in substance).

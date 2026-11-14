# Proposal: records-editor (ROADMAP P2 — Records & editor)

## Why

The round-trip spike retired risk #1 and left a validated editor stack (TipTap + `@tiptap/markdown` 3.33) behind a permanent build gate. P1 records are still edited through the generic JSON-fields form. P2's core deliverables — template-shaped schemas and forms, the visible prose editor, `@` mentions, the world calendar, typed relationships with backlinks, and version history — are all missing, and the hierarchy still lists children by title instead of a real play order (recorded P1 debt). This change completes ROADMAP P2: creating and editing a complete record from a real template.

## What Changes

- **Template schemas**: hand-authored Zod schemas in `packages/schemas` for the 15 templates and 8 catalogs (source of truth: `templates/`), covering the field-type vocabulary (prose, short text, free numeric string, money, calendar date, recurrence, enum, reference 0..1, reference 0..n, asset reference, play status, order, reusable Statistics block). Record `fields` are validated against the record's template schema on create/update. Template-derived labels stay verbatim English data — outside the i18n catalogs.
- **Generated edit forms**: a generic form renderer maps schema fields to controls (text, select, money, date picker, references with autocomplete, Statistics block, order); empty-means-hidden reading stays.
- **Prose editor**: TipTap mounted in the record form with a toolbar (emphasis, headings, lists, quote, code, link, image, hard break, typed blocks); bodies load and save as markdown through the round-trip contract — the harness corpus grows with every custom node as it lands.
- **`@` mentions**: word-start trigger with slug-charset autocomplete (debounced search over titles, `pg_trgm`-indexed); mentions parsed on save into the `mentions` table, rendered with the target's current title (dynamic resolution), dead targets styled as dead links.
- **Typed blocks**: `:::attention` and `:::mechanics` fenced containers (the probe pattern generalized) for the Scene running-notes pattern.
- **World calendar**: definition in `settings` (months, week, day names, one moon), admin calendar editor, typed date values (optional era, signed years, no year 0, partial granularity), calendar date nodes in prose, Events start/end/recurrence fields, and a **year overview view**: the world's year rendered month by month, days carrying a visible indicator when events occur, a click on a day showing below the calendar the list of that day's events with links to their sheets. This brings event occurrence computation into scope (punctual, inclusive periods, recurrence expansion clamped to the viewed year).
- **Recorded decision (2026-11-11)**: the instance restarts from an empty database — no migration of the P1 test-session records; template validation applies to content created from now on.
- **Typed relationships & backlinks**: reference fields write `relationships` rows keyed by field; backlinks section at the end of each sheet (reverse references + incoming mentions).
- **Version history**: `entity_versions` snapshot on every save, per-record list, read-only version view, restore as a new save.
- **Play order**: explicit `Order` field on Chapter and Scene (`templates/` updated); children listed in play order with move up/down on the parent sheet.
- **Record sheets in read mode**: opening a record shows the reading view (fields by template), an Edit action leads to the form; saving returns to the reading view. No generic body exists — the templates define every field.
- **Recorded decisions carried in**: bespoke sheet components in code, worked template by template with the DM (PRE-SPEC §5 rule 10) — the change ships the sheet mechanism plus a representative first template, with the remaining sheets as explicit task batches.

## Capabilities

### New Capabilities

- `template-schemas`: the executable template data model — per-template field schemas, the field-type vocabulary, the Statistics block, enums, money, order, and API-side validation of `fields`.
- `record-editor`: the editing experience — TipTap toolbar, markdown load/save under the round-trip bar, `@` mentions with autocomplete and dead-link marking, typed blocks, calendar date nodes.
- `record-relationships`: typed reference fields (one field = one target template) and the per-record backlinks section.
- `world-calendar`: calendar definition and admin editor, date value semantics, calendar date nodes, Events start/end/recurrence data, occurrence computation, and the year overview with per-day event indicators and list.
- `record-versions`: per-record version snapshots, list, read-only view, restore.

### Modified Capabilities

- `records-hierarchy`: `fields` validated against the record's template schema (no more structurally-validated JSONB only); children listed in explicit play order (new `Order` field, move up/down) instead of title order.

## Impact

- **Data model**: migrations — `mentions` table (entity_id, target_slug, indexed), `entity_versions` (entity_id, snapshot JSONB, at, source), partial unique index on `relationships (from_id, kind)` generalized beyond hierarchy kinds, `pg_trgm` index on `entities.title`/`slug` for autocomplete, `settings.calendar` key (runtime).
- **Backend**: `entities` gains template-schema validation, search-for-autocomplete endpoint (`GET /api/records?q=&type=`), mentions parsing on save, backlinks endpoint, versions endpoints; `calendar` module gains its definition endpoints and the event occurrence computation for the year view.
- **Frontend**: new dependencies (`@tiptap/extension-mention`, `@tiptap/suggestion`); generic form renderer + Statistics block control; TipTap editor component; reading-view sheet scaffold + the first bespoke template sheet (Characters and entities); order controls; calendar editor + year overview page (navigation entry); versions panel.
- **Docs**: `templates/_index.md` gains the `Order` field on Chapter and Scene; `PRE-SPEC.md` §5 rule 10 already records the sheet approach; no `ARCHITECTURE.md` §2 change (editor and forms decisions already recorded).
- **Tests**: template schema round-trips, form rendering, mention parsing, autocomplete endpoint, backlinks, versions, calendar date semantics — org Sonar gate (80% new-code coverage) applies; i18n fr+en for every new label.
- **Out of scope (deferred, recorded)**: recurrence occurrence helpers beyond the year overview (previous/next navigation), full-text `tsvector` search (P3), asset upload/S3 (P4 — Illustration fields store a reference placeholder until then), remaining bespoke sheets beyond the first (task batches in this change).

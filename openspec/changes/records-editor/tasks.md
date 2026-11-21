# Tasks: records-editor

## 1. Template schemas (`packages/schemas`)

- [x] 1.1 Field-type vocabulary: money (currency-aware), calendar date, recurrence, typed references (0..1 / 0..n), order, statistics block — each with unit tests on the validation rules
- [x] 1.2 Statistics block schema: ability scores + SRD modifier computation (pure function), saving throws, AC, HP, multi-mode speed, initiative, enums, darkvision, passive perception, damage-type references
- [x] 1.3 One schema per template/catalog (23) in `packages/schemas/src/templates.ts` + registry test asserting exact coverage against `templates/`
- [x] 1.4 API-side validation: service parses `fields` against the record's template schema (unknown types keep structural validation); error codes translated client-side; suite tests

## 2. Autocomplete and mentions backend

- [x] 2.1 Migration: `mentions` table, `pg_trgm` indexes on `entities.title`/`slug`; run and verify
- [x] 2.2 `GET /api/records?q=&type=` autocomplete endpoint (trigram search, access-filtered, template filter); service tests
- [x] 2.3 Mentions parsing on save: walk the body markdown, replace-all into `mentions`; test parsing with edge cases (emails, word-start rule)

## 3. Prose editor

- [x] 3.1 TipTap editor component: mounted editor from the spike's extension set + toolbar mapping (bold/italic/strike/headings/code/quote/lists/table/link/image/hard break); body loads via `setContent` markdown, saves via `getMarkdown()`
- [x] 3.2 Wire the editor into the record form (replacing the body textarea); round-trip suite re-run on the corpus green
- [x] 3.3 Typed blocks: generalize `AttentionPoint` into a fenced-container factory, add `:::mechanics`; toolbar insertion; corpus fixtures for both; suite green
- [x] 3.4 Mentions node: `@tiptap/extension-mention` + suggestion plugin (word start, slug charset, debounce, template filter); corpus fixture; suite green

## 4. Forms

- [x] 4.1 Generic form renderer: schema → controls (text, money, calendar date, recurrence, selects, statistics block, asset); Field/SlugTitleFields integration — the order stepper ships with the play-order fields (8.x) and reference inputs with 4.3/6.3
- [x] 4.2 Statistics block control: raw inputs with SRD modifiers displayed on leaving edit mode
- [x] 4.3 Reference controls: 0..1 replace + 0..n add/remove, autocomplete against the target template

## 5. Calendar

- [x] 5.1 Calendar date semantics (era, signed year, no year 0, partial): shared validation in `packages/schemas`, unit tests
- [x] 5.2 Admin calendar editor (months/week/day names/moon) in the admin panel, admin-gated; settings.calendar persistence
- [x] 5.3 Date picker fed by the definition; date node in the editor with canonical markdown form + corpus fixture; suite green
- [x] 5.4 Events template fields (start/end/recurrence) validated as data
- [x] 5.5 Event occurrence computation (punctual, inclusive periods, recurrence expansion clamped to the queried year, calendar-aware month lengths) — pure service + unit tests, including partial-date and period edge cases
- [x] 5.6 Year overview page: 12-month responsive grid, previous/next year navigation, day indicators, click → day's event list below with links to the sheets; navigation entry; empty state before definition; component tests

## 6. Relationships and backlinks

- [x] 6.1 Migration: generalize the partial unique index on `relationships (from_id, kind)`; generic reference endpoints (attach/detach by field key, validated against the template schema); service tests
- [x] 6.2 Backlinks endpoint (reverse references grouped by field + incoming mentions, access-filtered); service tests
- [x] 6.3 Wire reference fields into forms; backlinks section on the sheet scaffold

## 7. Versions — out of scope (DM decision, 2026-11-21)

The DM does not version their records: the `entity_versions` migration, the endpoints and the versions panel are dropped from this change, together with the `record-versions` delta. The sheet scaffold carries children and backlinks only (task 9.1 amended).

## 8. Play order

- [x] 8.1 Add `Order` to Chapter and Scene templates (`templates/_index.md` + the two files) and to their schemas
- [x] 8.2 Children listing ordered by `Order` (missing last, then title); reorder action rewriting sibling orders; endpoint tests
- [x] 8.3 Move up/down controls on the parent sheet

## 9. Sheets

- [x] 9.1 Reading-view scaffold: template-shaped fields (empty-means-hidden), children + backlinks at the end; open = read mode, save returns to read mode with confirmation
- [x] 9.2 First bespoke sheet: Characters and entities (statistics, references, public/private prose, self-references) — DM review gate before batching
- [x] 9.3 Remaining sheets in batches (12 world templates, 2 campaign, 8 catalogs — 22 after the first), each through the impeccable skills and DM review
  - [x] 9.3a World templates (12/12), the campaign pair (Chapter, Scene), the Campaign page (merged record content + chapter/scene manager) and the 8 catalogs through the shared CatalogSheet — the batch is complete
  - [x] 9.3b Catalog access surface: Catalogs section on the Lore page and in the Lore sidebar (non-empty catalogs only, grouped under a label), grouped type select in the creation form; app-shell-navigation delta spec added
- [x] 9.4 i18n: every new interface label in fr+en, parity test green — audit of all 243 static `t()` keys plus the dynamic prefixes (enums, lore.categories, campaigns.status, stats, money, fields) resolving in both catalogs; recursive fr/en parity clean (no orphan keys either side); template-derived labels stay verbatim data per the i18n rule
- [x] 9.6 Review-feedback sweep (CodeRabbit majors + Sonar gate): recurrence walk rewritten from the anchor, atomic relationship/mention writes, scoped sibling reorders, chapter deletion guard, edit-session draft lifecycle, mounted-editor refetch sync, calendar load errors, form control hardening, Drizzle declarations aligned with the applied migrations — plus the statistics/actions block rework (equipment, editable skill modifiers, reactions and legendary actions) reviewed with the DM
- [x] 9.5 Final verification: full suites (app 17 files/110 tests, app-web 60 files/278 tests), root typecheck and lint clean, round-trip suite green (32 tests over the corpus and ad-hoc fixtures), Sonar gate OK on new code (reliability/security/maintainability A, new-code coverage 84.4%, duplication 1.6%, hotspots 100% reviewed); `openspec validate records-editor --strict` — scope note: per-record version history left this change on 2026-11-21 (task 7), so the final state ships without it

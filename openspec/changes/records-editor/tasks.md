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
- [ ] 4.3 Reference controls: 0..1 replace + 0..n add/remove, autocomplete against the target template

## 5. Calendar

- [ ] 5.1 Calendar date semantics (era, signed year, no year 0, partial): shared validation in `packages/schemas`, unit tests
- [ ] 5.2 Admin calendar editor (months/week/day names/moon) in the admin panel, admin-gated; settings.calendar persistence
- [ ] 5.3 Date picker fed by the definition; date node in the editor with canonical markdown form + corpus fixture; suite green
- [ ] 5.4 Events template fields (start/end/recurrence) validated as data
- [ ] 5.5 Event occurrence computation (punctual, inclusive periods, recurrence expansion clamped to the queried year, calendar-aware month lengths) — pure service + unit tests, including partial-date and period edge cases
- [ ] 5.6 Year overview page: 12-month responsive grid, previous/next year navigation, day indicators, click → day's event list below with links to the sheets; navigation entry; empty state before definition; component tests

## 6. Relationships and backlinks

- [ ] 6.1 Migration: generalize the partial unique index on `relationships (from_id, kind)`; generic reference endpoints (attach/detach by field key, validated against the template schema); service tests
- [ ] 6.2 Backlinks endpoint (reverse references grouped by field + incoming mentions, access-filtered); service tests
- [ ] 6.3 Wire reference fields into forms; backlinks section on the sheet scaffold

## 7. Versions

- [ ] 7.1 Migration: `entity_versions`; snapshot append on create/update in the same transaction; service tests
- [ ] 7.2 Endpoints: list (newest first), read-only snapshot, restore-as-update; service tests
- [ ] 7.3 Versions panel on the sheet (list + read-only view + restore action)

## 8. Play order

- [ ] 8.1 Add `Order` to Chapter and Scene templates (`templates/_index.md` + the two files) and to their schemas
- [ ] 8.2 Children listing ordered by `Order` (missing last, then title); reorder action rewriting sibling orders; endpoint tests
- [ ] 8.3 Move up/down controls on the parent sheet

## 9. Sheets

- [ ] 9.1 Reading-view scaffold: template-shaped fields (empty-means-hidden), children + backlinks + versions at the end; open = read mode, save returns to read mode with confirmation
- [ ] 9.2 First bespoke sheet: Characters and entities (statistics, references, public/private prose, self-references) — DM review gate before batching
- [ ] 9.3 Remaining sheets in batches (12 world templates, 2 campaign, 8 catalogs — 22 after the first), each through the impeccable skills and DM review
- [ ] 9.4 i18n: every new interface label in fr+en, parity test green
- [ ] 9.5 Final verification: full suites (app, app-web), typecheck, lint, Sonar gate on new code, round-trip suite green with all new fixtures; `openspec validate records-editor --strict`

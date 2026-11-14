# Design — records-editor

## Context

The spike left a validated plan-A editor stack (`@tiptap/markdown` 3.33 stable, harness + corpus + custom-node probe in `app-web/src/editor/round-trip/`), a `Field`/`SlugTitleFields` form-component seed, and P1's generic records CRUD (`entities` with structurally-validated `fields`). `templates/` defines the target data model (15 templates + 8 catalogs, fields in order, English labels verbatim); PRE-SPEC §5 carries the cross-cutting rules (no required field, empty-means-hidden, one field = one target template, statistics block, play order). See proposal.md — this design records the HOW decisions. **Recorded decision (2026-11-11)**: the instance restarts from an empty database, so no migration of P1 test-session content — template validation applies to content created from now on.

## Goals / Non-Goals

**Goals:**

- Templates become executable: schemas validate, forms render, sheets read.
- The prose editor replaces the textarea under the round-trip contract, with mentions, typed blocks and date nodes.
- Relationships, backlinks, versions and the play order close the recorded P1 debts.

**Non-Goals:**

- No full-text search, no `[TO BE SPECIFIED]` inventory (P3); no asset upload/S3 (P4 — Illustration fields accept a reference placeholder); no MCP surface (P5); no offline work.
- No version diff UI (list + read-only view + restore); no recurrence helpers beyond the year overview's computation (previous/next navigation).
- No player-facing rendering — the public/private description split stays a rendering distinction for the DM.
- Bespoke sheets beyond the first representative template are task batches, not redesigns: the mechanism ships once, the DM reviews template by template.

## Decisions

1. **Templates as hand-authored Zod schemas** — `packages/schemas/src/templates.ts` defines one schema per template/catalog plus the shared vocabulary (money with currency, date, recurrence, references typed by target template, statistics block, order). `templates/` stays the narrative source of truth; a test asserts the registry covers exactly the 23 template files and that every field key matches the template's field list. Alternatives: code-generating schemas from `templates/` parsing — rejected, the templates are prose, and hand-authored schemas with a coverage test are reviewable and stable.
2. **API-side validation composes, not replaces** — `createEntitySchema`/`updateEntitySchema` keep validating the envelope; the service looks up the template schema by `type` and parses `fields` against it (unknown record types keep the P1 structural validation). Rejection surfaces stable error codes translated client-side.
3. **Forms: one generic renderer + per-template sheets** — edit forms render from the schema via a field-to-control map (text, textarea, money, date picker, selects, reference autocomplete, Statistics block, order stepper); reading views are bespoke sheet components in code (PRE-SPEC §5 rule 10). Characters and entities ships first — it exercises every hard control (statistics, references to catalogs and templates, public/private prose, self-references); the DM reviews it before the remaining sheets are batched.
4. **Editor shell reuses the spike stack** — `app-web/src/editor/` grows from `round-trip/`: the TipTap configuration used headless becomes the mounted editor's configuration (same extension set + toolbar mapping). Save = `editor.getMarkdown()` canonicalized and diffed against the round-trip bar in the suite; every new custom node (mention, date, `:::mechanics`) lands with a corpus fixture in the same commit.
5. **Mentions** — `@tiptap/extension-mention` + `@tiptap/suggestion`; trigger at word start, slug charset, debounce 200 ms; autocomplete queries `GET /api/records?q=&type=` backed by `pg_trgm` on `title` (and `slug`). Parsing on save walks the document, writes `mentions (entity_id, target_slug)` (replace-all per save), dead-link marking reads existence from the sheet's data. Emails never tokenize as mentions (trigger rule + slug charset, as PRE-SPEC §6).
6. **Typed blocks and editorial markers** — the probe's `AttentionPoint` generalizes to a shared fenced-container node factory; the Scene running-notes pattern maps player-readable prose to plain paragraphs and attention points to `:::attention` (the `:::mechanics` block was dropped at the DM's review — the highlight was unused). The prose layer also gains the editorial markers the DM requested: an inline **dice node** (`[[dice:3d6+2]]`, rendered with its round-down stat-block average) and two **intent marks** (`==…==` to paraphrase, `++…++` to develop). Visual distinction at render time only — no access model change (the product is DM-only).
7. **Calendar** — `settings.calendar` holds `{ months: [{name, days}], week: {days}, dayNames: [...], moon: {name, cycleDays} }`; the admin panel gains a structured editor. `CalendarDate = { era?, year, month?, day? }` — signed years, **no year 0** (astronomical counting: …, −1, 1, …; recorded in PRE-SPEC §4 as "to confirm" — confirmed here). Date nodes store `{era?, year, month?, day?}` in node attrs with a canonical inline markdown form; the picker derives month lengths from the definition. Events fields (`start`, `end`, `recurrence`) validate as data; occurrence computation is deferred.
8. **Relationships: kind = field key** — reference fields write `relationships (from_id, to_id, kind = field key)`; a partial unique index on `(from_id, kind)` enforces 0..1 semantics generically. The hierarchy fields join the same rule: a Chapter's `campaign` field writes kind `campaign`, a Scene's `chapter` field writes kind `chapter` — replacing P1's `chapter`/`scene` pair, which the empty-database restart (decision 13) frees without migration. The tracking and parent endpoints adopt the new kinds. Backlinks = one endpoint returning reverse references grouped by field + incoming mentions.
9. **Versions: service-level snapshots** — on create and update the entities service appends an `entity_versions` row (full snapshot JSONB, at, source `"dm"`) in the same transaction. Endpoints: list (newest first), get one, restore (applies snapshot through the normal update path, producing a new version). No diff UI.
10. **Play order** — `Order` field added to the Chapter and Scene templates (non-negative integer, optional); children listing orders by it (missing last, then title); move up/down rewrites sibling orders on the parent sheet via a dedicated reorder action. `templates/_index.md` and the two template files gain the field.
11. **Sheet scaffold** — a shared reading scaffold (title, fields by template order with empty-means-hidden, rendered body, children, backlinks, versions entry point) plus a per-template component slot; Characters and entities is the first bespoke slot, validated with the DM before batching the remaining 22.
12. **Year overview** — a dedicated page + navigation entry (`Calendrier`/`Calendar`), rendering all 12 months of the definition in a responsive month grid (tablet-first), with previous/next year navigation. Occurrence computation lives in the calendar module (pure, unit-tested, trivially fast at one world × one year): punctual starts, inclusive periods, recurring expansion from the anchor clamped to the queried year, recurring periods repeating the day span. Only day-resolvable events mark days (partial dates stay unmarked — recorded limitation, deliberate). Activating an indicated day renders the day's event list below the grid, each entry linking to the event's sheet.
13. **Empty-database restart** — the DM restarts from an empty database: no data migration is written; the P1 test-session records are discarded. Schema validation applies to newly created content.
14. **No generic body** — the templates define every field of a record; none declares a generic markdown body. The body is removed outright (column, API envelope, forms, reading scaffold) instead of being gated per template: prose lives exclusively in template prose fields, and the mention scan walks those values only. The editor, toolbar, round-trip suite and typed blocks are untouched — they serve prose fields.

## Risks / Trade-offs

- [26 bespoke sheets are a long tail] → mechanism + one reviewed template first; batches are mechanical after the DM validates the pattern.
- [Mention + date nodes expand the round-trip surface] → corpus fixtures land with each node (decision 4); the suite gates every merge.
- [`pg_trgm` autocomplete on a small world is cheap but adds a migration] → GIN index migration is additive; scale stays trivial for a personal tool.
- [Statistics-block validation can reject DM edge cases] → every field optional, values free-form where PRE-SPEC says so; strict only where the vocabulary is closed (enums, damage types).

## Migration Plan

One migration set: `mentions`, `entity_versions`, generalized partial unique index on `relationships (from_id, kind)`, `pg_trgm` indexes. Additive only; `settings.calendar` is runtime-written. Rollback: drop the new tables/indexes.

## Open Questions

None blocking. The typed-block names (`attention` / `mechanics`) and the definitive running-notes set are confirmed with the DM at the first sheet review.

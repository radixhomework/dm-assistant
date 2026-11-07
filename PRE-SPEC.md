# PRE-SPEC.md — pre-specification

Detailed, verifiable behavior that will feed the OpenSpec changes (`openspec/`). The solution documents stay decision-level: `PRODUCT.md` (what), `ARCHITECTURE.md` (how, decisions), `GOVERNANCE.md` (content contract), `AGENTS.md` (agent rules). This file carries the cross-cutting rules; the `templates/` folder is the source of truth for templates and catalogs (fields, order, English labels verbatim).

## 1. Localization (i18n)

- Library: `react-i18next`, catalogs `fr` + `en`.
- **Every user-facing string goes through the catalog — no hard-coded label.** A label committed without both its French and English entries is an incomplete change.
- UI language: instance default from `UI_LOCALE` in `.env` (default `en`, alternative `fr`); each user picks their own at runtime, stored on their account.
- API errors: stable error codes; translation happens client-side — the backend never returns formatted human messages.
- Boundary: template-derived labels (field names, named blocks, enum values from `templates/`) are data preserved verbatim in English — they live **outside** the i18n catalogs and are not translated by them.
- Dates and numbers formatted with `Intl` according to the active UI locale.

## 2. Configuration, content language and full-text search

- **One world per instance**: the world is the instance — no worlds table, no world-level settings layer.
- `settings(key UNIQUE, value)` at instance scope. v1 keys: `ui_locale`, `registration_open`, `content_language`, `distance_unit`, `weight_unit`, `calendar`.
- `AUTHORING_LOCALE` in `.env` (default `en`, alternative `fr`): content language set at the first-startup wizard, stored in `settings`.
- Full-text search: `search_vector tsvector` on `entities`, trigger-maintained from `title` + `body` with the config derived from the content language (`en` → `english`, `fr` → `french`); `unaccent` always applied; GIN-indexed. One world = one config — no per-scope merge. Changing the content language reindexes all records (background job). Queries parse with the same config.
- Acceptance: searching ignores accents in both languages (e.g. `ecole` finds `École` in fr; same behavior in en).
- **Units** (distance, weight): instance settings edited in the admin panel; values are stored in the configured unit — changing the unit **never** recalculates anything (a labeling preference, not a conversion engine). The conversion barème is displayed as help next to the unit selectors: 5 ft = 1.5 m · 1 mile = 1.5 km · 1 lb = 500 g · 1 gal = 4 l. The SRD import converts values once into the world's units.

## 3. Accounts and access — decision in progress

Settled:

- **First-startup wizard**: creates the administrator account **and the world** (name, content language).
- **Open registration** after the wizard: an administrator can block/unblock it at any time (persisted in `settings`); rate-limited like login; self-registered accounts land active.
- **Admin panel** (admin only): create accounts, block/unblock accounts, toggle registration, edit instance settings (content language, units, calendar).
- Roles `admin` / `dm`; account status `active` / `blocked` (blocked = cannot log in; content and grants stay intact).
- Every data path is access-filtered in the repositories — no unfiltered query path, whatever the pending model settles to.

Pending (blocks the sharing design, not the rest):

1. Multi-DM usage: several DM accounts on the one world, or the admin only?
2. A reader role (read-only accounts)?
3. Public lore: read access without account (opt-in), or internal-only?

## 4. Calendar

- One definition per world: months (ordered list: name, number of days — the year length follows), week (number of days), day names (cycled), a single moon (name, cycle in days). Intercalary days outside months: parked.
- **Date** = (optional era, year, optional month, optional day): signed years (negative allowed, no year 0 — to confirm at spec time), partial granularity allowed (year alone; never month without year).
- **Event** (the Events template is the calendar registry): `Start` and `End` optional dates, `Recurrence` optional `{unit: week | month | year, interval: x}`.
- Semantics: start only = punctual event; start + end = period; recurrence applies to both and is anchored on the start date (previous/next occurrences computed from it).
- **Prose date node**: a date embedded in prose is a dedicated editor node (calendar picker, canonical markdown representation); a complete date renders clickable; a raw/incomplete date stays plain text.

## 5. Data model — rules, types and inventory

Field structure lives in `templates/` (15 templates + 8 catalogs, fields in explicit order, English labels verbatim). Cross-cutting rules:

1. **Empty = hidden**: in reading mode an unfilled field is hidden; a filled field displays — including `[TO BE SPECIFIED: …]` markers.
2. **The record title IS its name** — no name field in any template.
3. **Slug immutable**: created once, never changed; `@slug` mentions resolve the current title dynamically.
4. **One field = one target template** (each reference field types its relationships).
5. **Public/private prose pattern** (two reading levels, nothing finer) applies to most templates.
6. **No required field**; no field bound to a template — associations are the DM's act.
7. **Mechanical fields are never invented** — DM notes or SRD import only (charter rule 6).
8. **Hierarchy**: Campaign → Chapter → Scene carried by child→parent references (0..1); the children of a record display at the end of its sheet (backlinks section). A one-shot is a campaign with a single chapter.
9. **Play tracking**: explicit status on Scene only (not played / in progress / played); Chapter and Campaign derive theirs from their children.

Field-type vocabulary: prose · short text · free numeric string · money (GP/SP/CP, factor 10 between each) · calendar date · recurrence · enum · reference 0..1 · reference 0..n · asset reference · play status · **reusable Statistics block** (embedded by Characters and entities, Monsters, Fauna, Flora — full definition in `templates/_index.md`: 6 ability scores with SRD-calculated modifier shown after leaving edit mode, optional saving throws carrying both raw score and modifier, AC, HP with formula, multi-mode speed, initiative modifier, SRD alignment/type/size, darkvision with world unit, passive perception, damage-type references).

Enums: Gender (Male, Female, Nonbinary) · Place type (Intangible place, Locality, City) · Political system (16 values) · SRD enums: Alignment, Type, Size (6 values), Rarity (7 values). Qualitative home-grown enums were dropped in the rework — prose carries the nuance.

Catalogs: 8 reference templates (Classes, Species, Conditions, Damage types, Treasure types, Languages, Fauna, Flora) — structure Pitch / [Statistics block for Fauna and Flora] / Public description / Private description. Two sources: `srd / unearthed arcana` (imported, **non-editable**) and `manual` (DM-created, editable). SRD import is a human action (charter rule 6) and converts values once into the world's units.

## 6. Editor

- **`@` mention**: at word start (preceded by space/punctuation/line start) + slug charset `[a-z0-9-]`, terminated by a separator — email addresses excluded by construction. Autocompletion searches titles (debounced `GET /api/entities?q=&type=`). Parsed on save → `mentions` table; feeds backlinks, audit, graph.
- Rendering: `slug → current title` resolved dynamically; color by template type; deleted entity → mention marked as dead link.
- **Running notes prose** (Scene): multi-block content with typed blocks — player-readable/paraphrasable text, DM mechanics, attention points, images, tables. (Dice-roll formatting: parked.)
- **Markdown round-trip acceptance test from day 1**: a real template through the editor = empty diff (hard breaks, tables, fences included). Failure → plan B CodeMirror 6.

## 7. MCP API surface

Transport and scopes in `ARCHITECTURE.md` §7. Tools:

- `search_records(query, type)` — full-text search
- `get_record(slug)` — one record, fields and body
- `list_type(type)` — all records of a template or catalog
- `list_tags()` — tag inventory
- `list_missing()` — `[TO BE SPECIFIED]` inventory
- `annotate(slug, message)` — coherence annotation
- `propose_modification(slug, content, justification)` — modification proposal

No direct-write tool exists (double lock: token scope + application service). Result scoping follows the access model once settled (§3).

## 8. Settings screen and admin panel

- **Settings screen** (every DM): UI language, Wizards of the Coast attribution (credits page).
- **Admin panel** (admin only): account management (create, block/unblock), registration toggle, instance settings (content language, distance/weight units with barème help, calendar definition).
- Persisted in `settings`; `.env` provides startup defaults only.

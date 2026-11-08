# PRODUCT.md — DM Assistant

## 1. Identity

- **Nature**: self-hosted webapp (PWA) + MCP server.
- **Users**: Dungeon Masters (DMs), one account each; the account created by the first-startup wizard is **administrator**.
- **Scope**: management of the lore and campaigns of **D&D 5.5**.
- **Organization**: **one world per instance** (a personal tool by design); a **Campaign** record contains its Chapters and Scenes (a one-shot is a campaign with a single chapter). Access and sharing model: being finalized.
- **Devices**: tablet = primary editing place; PC = work with an AI harness; consultation anywhere via browser or installable PWA.
- **Context**: complements the companion tooling from the lore repository (charter, templates, skills). No VTT integration — in-game presentation stays outside this app.

## 2. Problem and vision

Existing tools are compromises: hosted wikis (data out of your control, generic editor), Notion/Docmost (database content unreachable by an AI harness, no lore autocompletion), GitHub repo + Pages (excellent versioning but painful tablet editing, no autocompletion, links typed by hand).

**Vision**: the "home lore" — the records the DM already structures with their 21 templates, served by an application they own, with an AI assistant that creates **nothing** but guarantees **coherence** (detection, flagging, gap inventory).

## 3. v1 features

1. **Records following the 15 templates** (perimeters `world` / `campaign`): forms generated from template fields, free-form markdown body, no field association imposed, no required field.
2. **One world per instance**, set up at the first-start wizard; a **Campaign** record contains its Chapters and Scenes (child→parent links, children listed at the end of the parent sheet); a one-shot is a campaign with a single chapter; **play tracking** — explicit status per Scene (not played / in progress / played), derived for Chapters and Campaigns.
3. **Prose editor with `@` mentions**: autocompletion resolved by title, title resolved dynamically at render time (renames follow without rewriting), dead links detected; **calendar date nodes** (picker, complete dates clickable); **multi-block running-notes prose** for Scenes (player-readable, mechanics, attention points, images, tables).
4. **World calendar**: months, week, day names, one moon; typed dates (optional era, signed years, partial dates allowed).
5. **External references**: local catalogue (`external_refs`) imported from public datasets (SRD 5.2 CC-BY-4.0) + deep links to aidedd.org and 5e.tools, grouped by source and type (monster, spell, item…), visual badge at render time.
6. **SRD catalogs**: 8 reference templates (Classes, Espèces, États, Types de dégâts, Types de trésors, Langues, Faune, Flore) populated by SRD import (human action, records non-editable) or manual creation by the DM.
7. **Typed relationships** between records (form fields) + **backlinks** view per record.
8. **Full-text search** (accent-insensitive) over records and fields, in the content language chosen for the world (French or English).
9. **Version history** per record + **coherence audit**: dead links, orphan records, template violations.
10. **Inventory of pending `[TO BE SPECIFIED]`** markers, queryable.
11. **Assets**: upload through a backend gateway to internal S3 (maps, illustrations), generated thumbnails, record ↔ asset links, simple viewer (scaled image).
12. **MCP server** for the AI harness: search, read, coherence **annotations** (flagging) and modification **proposals** — never direct writes.
13. **Installable PWA**: offline reading (shell + cache), editing online only.
14. **Settings screen**: UI language (French / English, instance default configurable in `.env`), Wizards of the Coast attribution (credits page, see `GOVERNANCE.md`).
15. **Accounts & admin**: first-start wizard (administrator + world), user creation by an administrator only (admin panel), account blocking.

## 4. Out of scope for v1

- Offline editing, real-time collaboration (CRDT).
- Player features — the product is DM-only: no player accounts, no player-facing views (public lore access: under discussion).
- Multiple worlds per instance — one world, by design.
- Game mechanics production by the AI (never, see `GOVERNANCE.md`).
- VTT integration — not planned; the VTT (if used) stays a separate tool.

## 5. Success criteria

- Creating or editing a record on a tablet faster than on any generic tool (template forms + `@` mentions).
- Zero copy-paste: the harness produces proposals, accepted in a few gestures in the PWA.
- The audit surfaces contradictions and gaps without ever resolving them on the DM's behalf.
- A restored backup returns everything (records, assets, history) — verified periodically.

## 6. Parking lot (unplanned)

Centralized OIDC · chunked upload for huge files · 2FA · clickable map markers · intercalary days outside months · multiple moons · dice-roll formatting in the editor · record aliases.

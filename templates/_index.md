# DM Assistant templates

This folder defines the target data model of DM Assistant: the record **templates** (world and campaign) and the **catalogs** (SRD-fed reference lists). Each file lists the exact fields, in order.

It derives from the rework of the original Lore templates (the DM's campaign tool, Amsel suite): merges, removals and additions are traced at the end of this file.

## Structure

- `world/` — world perimeter, organized by category;
- `campaign/` — campaign perimeter;
- `catalogs/` — reference lists populated by SRD / Unearthed Arcana import or manual creation.

## Common rules

- **No required field**: fields fill as needed, per page.
- **No field is bound to a template**: associations are made by the DM — never in the templates.
- **Empty = hidden**: in reading mode, an unfilled field is hidden; a filled field displays, even when it holds a `[TO BE SPECIFIED: …]` marker. The template stays complete, the sheet stays light.
- **The record title IS its name** — no Name field in the templates.
- **The slug is immutable**: `@slug` mentions resolve the current title dynamically.
- **One field references one target template**.
- **Public description / Private description**: two reading levels, nothing finer — the pattern applies to most templates.
- **Mechanical fields** (statistics, prices, weights…) are **never filled by invention**: each value comes from the DM's notes or the SRD import; what is missing stays `[TO BE SPECIFIED: …]` (repository charter, rule 6).

## Reusable blocks

### Statistics block

Embedded by: Characters and entities, Monsters, Fauna, Flora.

- **Ability scores** (6) — Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma. The raw value is entered; the modifier is computed by the SRD rule and displayed in parentheses when leaving edit mode.
- **Saving throws** (6, optional) — for each, both the raw ability score **and** the throw modifier are entered.
- **AC** — plain number.
- **HP** — average and formula, as the SRD does (e.g. `66 (12d8+12)`).
- **Speed** — several values by mode (walk, fly, swim, burrow, climb).
- **Initiative** — the modifier is entered; the initiative value displays in parentheses.
- **Alignment** — from the SRD (value list provided by the import).
- **Type** — from the SRD (value list provided by the import).
- **Size** — one value among: Tiny, Small, Medium, Large, Huge, Gargantuan.
- **Darkvision** — distance; the unit is set in the world administration.
- **Passive Perception** — value.
- **Vulnerabilities / Resistances / Immunities** — references 0..n to Damage types.

Units: values are entered in the unit configured for the world (distance, weight); changing the unit never recalculates anything. Conversion only happens at SRD import. Barème: 5 ft = 1.5 m · 1 mile = 1.5 km · 1 lb = 500 g · 1 gal = 4 l (displayed as help next to the unit selectors).

## Catalogs

Eight reference lists: Classes, Species, Conditions, Fauna, Flora, Languages, Damage types, Treasure types.

- Common structure: **Pitch**, [**Statistics block** for Fauna and Flora], **Public description**, **Private description**.
- Two sources: `srd / unearthed arcana` — records created by the import, **non-editable**; `manual` — records created by the DM, editable.
- The SRD import is a **human action** (repository charter, rule 6); imported values are converted into the world's units.

## Calendar

One calendar definition per world: months (names, number of days — the year length follows), week (number of days), day names, one moon (name, cycle in days).

A **date** = optional era + year (signed integer, negatives allowed, no year 0) + month + day, with variable granularity (year alone is allowed, never month without year).

**Events** (the Events template) carry optional start/end dates and an optional recurrence anchored on the start: start only = punctual, start + end = period.

## Inventory

### World perimeter

**Bestiary** — [Monsters](world/bestiary/monsters.md)

**Chronicle** — [Events](world/chronicle/events.md)

**Culture** — [Beliefs, myths and customs](world/culture/beliefs-myths-and-customs.md) · [Knowledge and technologies](world/culture/knowledge-and-technologies.md) · [Works](world/culture/works.md)

**Geography** — [Places](world/geography/places.md) · [Natural landmarks](world/geography/natural-landmarks.md)

**Characters** — [Characters and entities](world/characters/characters-and-entities.md)

**Game system** — [Equipment and items](world/game-system/equipment-and-items.md) · [Game rules](world/game-system/game-rules.md)

**Society** — [Nations](world/society/nations.md) · [Organizations](world/society/organizations.md)

### Campaign perimeter

[Campaign](campaign/campaign.md) · [Chapter](campaign/chapter.md) · [Scene](campaign/scene.md)

### Catalogs

[Classes](catalogs/classes.md) · [Species](catalogs/species.md) · [Conditions](catalogs/conditions.md) · [Fauna](catalogs/fauna.md) · [Flora](catalogs/flora.md) · [Languages](catalogs/languages.md) · [Damage types](catalogs/damage-types.md) · [Treasure types](catalogs/treasure-types.md)

## Merges and renames (rework traces)

- Main NPCs + Secondary NPCs + Entities → **Characters and entities**
- Named places + Towns and settlements + Intangible places → **Places**
- Beliefs and myths + Customs (deferred) → **Beliefs, myths and customs**
- Political and civil organizations + Families and clans + Businesses and guilds + Armies and militias (deferred) + Cult organizations (deferred) → **Organizations**
- Periods → merged into **Events** (optional start/end: period or punctual)
- Arc → renamed **Campaign** (the record acts as the container; a one-shot is a campaign with a single chapter)
- Languages → moved to **catalogs** (common structure)
- Fauna, Flora, Knowledge and technologies, Game rules → produced templates (previously deferred)
- **Biomes** → removed (template and the Monsters field)
- Fields absorbed into the descriptions: Game rules, Effects and features, Availability and trade (Equipment) · Operation, History (Families) · Cultural footprint, Culture, Details (Entities) · Description/Summary of merged sources
- Dropped enums (moved to prose): Danger, Navigation, Resources · Power level, Organization level, Exposure, Popularity, Organization, Situation, Political influence, Corruption · Economic power, Military power · Influence
- Kept enums: Gender · Place type · Political system · Alignment, Type, Size, Rarity (SRD)

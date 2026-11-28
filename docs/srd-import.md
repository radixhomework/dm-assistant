# SRD catalog import

How to populate the 8 reference catalogs (Classes, Species, Conditions,
Damage types, Treasure types, Languages, Fauna, Flora) from a public
dataset. The import is an **explicit human action** run by an
administrator from the admin panel's *Import catalogs* tab — it is never
scheduled and never triggered by the AI (charter rule 6).

## 1. The dataset format: Open5e

The import consumes datasets following the **Open5e v2 object shape** —
verified against `https://api.open5e.com/v2`:

```json
{
  "key": "blinded",
  "name": "Blinded",
  "descriptions": [
    { "desc": "You can't see…", "document": "srd-2024", "gamesystem": "5e-2024" },
    { "desc": "EN Publishing text…", "document": "a5e-ag", "gamesystem": "a5e" }
  ]
}
```

- `name` — the displayed title.
- `key` — the stable slug (`[a-z0-9-]`); the **match key** for
  re-imports, stable across title changes. Flattened exports may name it
  `slug` instead.
- `descriptions[]` — per-document text entries (`desc` + `document`).
  Flattened exports may carry a bare `desc` string instead.
- Any other field is ignored: mechanical extras are **not imported** in
  v1 — the catalog templates hold Pitch / Public description /
  Private description (plus the Fauna/Flora Statistics block, which the
  import does not fill).

A payload is either a **bare array** of such objects or the **Open5e
paginated envelope** (`results[]` + `next`); in endpoint mode the
application follows the `next` links server-side, up to 20 pages.

## 2. Endpoint mode

Paste an HTTPS endpoint URL; the application fetches it server-side
(private addresses are refused). Useful Open5e v2 endpoints:

| Catalog | Endpoint (SRD 2024 / 5.2) |
|---|---|
| Classes | `https://api.open5e.com/v2/classes/?document__key=srd-2024` |
| Species | `https://api.open5e.com/v2/species/?document__key=srd-2024` (2014 rules: `/races/`) |
| Conditions | `https://api.open5e.com/v2/conditions/` |
| Damage types | `https://api.open5e.com/v2/damagetypes/` |
| Languages | `https://api.open5e.com/v2/languages/` |

Notes verified against the live API:

- The document filter is `document__key` (the `srd-2024` document is the
  **System Reference Document 5.2**, Wizards of the Coast, CC-BY-4.0).
- **Conditions, damage types and languages live under the `core`
  document**, with one row per concept and per-document `descriptions[]`
  entries — do not filter them; the application picks the description
  entry of the chosen document at mapping time. Rows of other sources
  (e.g. `a5e-ag_*` conditions) carry no SRD 2024 text and are skipped
  with their reason.
- A file upload (up to 10 MB) is the offline fallback: export the JSON
  you want and upload it; the flow is identical.
- The **Document** field selects whose text is read: `srd-2024` for the
  **SRD 5.2** (2024 rules) or `srd-2014` for the **SRD 5.1** (2014
  rules) — both published by Wizards of the Coast under CC-BY-4.0, so
  importing either is credited on the attribution page.

## 3. The mapping

| Dataset | Record |
|---|---|
| `name` | Title |
| `key` (or `slug`) | Slug (immutable, unique per instance) |
| `descriptions[]` entry of the chosen document, else `desc` | Public description (markdown, as provided) |
| — | Pitch and Private description stay empty — DM-authored |

The mapping never splits or rewrites the source prose (charter rule 1).
The document defaults to `srd-2024` and is selectable in the UI — set it
to `srd-2014` to import SRD 5.1 content instead.

## 4. The flow (preview before import)

1. Select the **target catalog** and the **external source** (created in
   the same tab; a disabled or the Internal source cannot run an import).
2. Choose the origin (file or endpoint URL) and run the **preview**.
3. The preview classifies every element:
   - **New** — will be created;
   - **Overwrite** — the slug already exists *under the same source*
     (pre-checked; untick to keep);
   - **Conflict** — the slug exists under a *different provenance*
     (another external source or Internal; unchecked by default —
     confirming rebinds the record to the importing source);
   - **Skipped** — invalid element, duplicate slug in the dataset, or
     slug held by a record of another type (slugs are unique per
     instance). Nothing blocks the run.
4. Confirm: the accepted set is written in **one transaction** and the
   report lists what was created, updated and skipped. A confirmed
   cross-source overwrite carries the dataset's values while the
   DM-authored Pitch and Private description are preserved.
5. Imported records are **read-only reference data**: their source
   fields, tags and deletion are locked (stable error
   `source_readonly`); only the Pitch and Private description stay
   editable. Changes arrive through a re-import.

## 5. Units

SRD imperial values convert once, at import, into the world's configured
units — barème: **5 ft = 1.5 m · 1 mile = 1.5 km · 1 lb = 500 g ·
1 gal = 4 l** (identity for imperial worlds). The v1 mapping carries no
dimensional field; the conversion walks the mapped fields on every
import (it fills the Statistics block when its import lands later).

## 6. Provenance and attribution

Every imported record carries its named source as a badge on its sheet;
the **Internal** source marks records created through the application.
The attribution page (`/attribution`, linked from the settings screen
and from every external badge) credits Wizards of the Coast under the
SRD 5.2 **CC-BY-4.0** licence and lists the instance's external sources
with their optional attribution notes (GOVERNANCE §4).

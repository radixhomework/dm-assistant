## Purpose

Populates the reference catalogs from external datasets the DM imports as a human action (charter rule 6): catalog records carry named-source provenance, imported records are non-editable reference data, the import previews what it will overwrite before running, and the Wizards of the Coast attribution obligation is honored.

## ADDED Requirements

### Requirement: Named catalog sources
Catalog records (the 8 catalogs) SHALL carry a provenance source chosen from a source registry the DM manages. The registry SHALL provide one built-in source — **Internal / Interne** — for records created through the application, and SHALL let an administrator create, rename and disable as many named external sources as needed (e.g. "Open5e (SRD 5.2)"), each carrying an optional attribution note. The source SHALL be set at record creation and immutable thereafter; catalog sheets SHALL display it as a badge showing the source name, and an external-source badge SHALL lead to the attribution page. Non-catalog records SHALL carry no source and display no badge. Disabling a source SHALL neither hide its existing records' badges nor break them — it only removes the source from import selection.

#### Scenario: UI creation is internal
- **WHEN** the DM creates a catalog record through the application forms
- **THEN** its source is the built-in Internal / Interne source, displayed as the Internal badge

#### Scenario: The DM names as many external sources as needed
- **WHEN** an administrator creates external sources "Open5e (SRD 5.2)" and "Ma source 2" with optional attribution notes
- **THEN** both are selectable at import time and displayable as badges, alongside the built-in Internal source

#### Scenario: Source is immutable
- **WHEN** any update is attempted on a catalog record's source
- **THEN** the stored source is unchanged — the only exception is the confirmed import overwrite that rebinds provenance (see the import requirement)

#### Scenario: Disabled source keeps its records
- **WHEN** a source is disabled after records were imported under it
- **THEN** those records keep their badge and their provenance — only new import selections change

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:50ede42be92be78003d6044e4bbf91a4484cc0531b0bb5d7a483f09f8b5189b8 -->

### Requirement: Imported records keep their source data read-only
Catalog records sourced from an external source SHALL reject updates to their source-derived fields (everything the dataset provided — the Public description and any structural value) and to their tags in per-record edits, and SHALL reject deletion through the application — the reference data changes only through a re-import. The fields the mapping leaves to the DM (the **Pitch** and the **Private description**) SHALL stay editable on imported records, so the DM authors them without breaking provenance. The sheet SHALL offer the DM-field editing but no edit action on source-derived fields or tags and no delete action. Catalog records from the Internal source and all non-catalog records remain editable and deletable as before. The one sanctioned removal channel for imported records is the **source-scoped purge**: an administrator lists the records one catalog carries under one source (disabled sources included) and deletes the selected ones in one transaction, with a report of what was removed and what was blocked — the per-record deletion of an imported record stays refused.

#### Scenario: The source-scoped purge removes selected records
- **WHEN** an administrator confirms the purge of the selected records of one catalog under one source
- **THEN** they are deleted in one transaction and the report names what was removed and what was blocked — the per-record delete of an imported record stays refused

#### Scenario: Imported record refuses reference edits, tag edits and deletion
- **WHEN** an update touches the tags or source-derived fields of a catalog record sourced from an external source, or requests its deletion
- **THEN** the request is rejected with a stable error code and the record is unchanged

#### Scenario: DM-authored fields stay authorable
- **WHEN** the DM writes the Pitch or the Private description of an imported catalog record
- **THEN** the edit is accepted and the source-derived fields, tags and source badge are unchanged

#### Scenario: Sheet splits the editable from the read-only
- **WHEN** an imported catalog record's sheet is opened
- **THEN** the Pitch and Private description offer their editing controls while the source-derived fields and tags carry no edit action and no delete action exists

#### Scenario: Internal record stays editable
- **WHEN** the DM edits a catalog record whose source is Internal
- **THEN** the edit is accepted as for any record

<!-- /coderabbit-ai-generated:v1 -->

### Requirement: Catalog import in the admin panel
The admin panel SHALL provide an Import catalogs tab where an administrator runs a catalog import as an explicit human action (never triggered by the AI, never scheduled). The import SHALL accept two origins: a **local JSON file upload** or an **API endpoint URL** fetched server-side (admin-only, HTTPS enforced, internal-address requests refused). The DM SHALL select the target catalog (one of the 8) and the external source before running. The flow SHALL be preview-before-import: the application fetches and parses the payload, validates every element against the catalog template schema, matches them against existing records, and displays a preview — new elements; existing records already bound to the SAME source that will be overwritten (pre-checked); and records bound to a DIFFERENT provenance (another external source or Internal) offered as per-item checkboxes, unchecked by default — before any write. The preview SHALL offer a select-all control covering every selectable element at once. Confirming SHALL execute the import in a single transaction, converting SRD imperial values once into the world's configured units (5 ft = 1.5 m · 1 mile = 1.5 km · 1 lb = 500 g · 1 gal = 4 l), and produce a report of what was created, updated and skipped. Confirming an over-write of a record bound to a different provenance SHALL rebind that record to the importing source — the badge always names the data's true origin. An import SHALL NEVER be blocked by same-name existing elements: conflicts surface in the preview, and the DM decides per element.

#### Scenario: File import with preview
- **WHEN** an administrator uploads a valid dataset file for the Conditions catalog under the source "Open5e (SRD 5.2)" and confirms the preview
- **THEN** the elements are created with unit-converted fields, the chosen source, and a report of each creation

#### Scenario: Endpoint import
- **WHEN** an administrator provides an HTTPS API endpoint URL returning the Open5e envelope
- **THEN** the application fetches it (following pagination), parses the elements and shows the same preview as the file mode

#### Scenario: Existing elements are identified before overwriting
- **WHEN** the preview lists elements whose slug already exists in the target catalog
- **THEN** each is shown with its current title, marked as will-be-overwritten when bound to the same source, or offered as an unchecked choice when bound to a different source (another external source or Internal)

#### Scenario: Internal records are protected by default
- **WHEN** the import is confirmed with an internal conflict left unchecked
- **THEN** that internal record is untouched and reported as skipped

#### Scenario: Cross-source overwrite rebinds provenance
- **WHEN** the DM confirms overwriting a record bound to source A with data from source B
- **THEN** the record carries source B, its badge names B, and its source-derived fields hold the dataset's values while the DM-authored fields are preserved

#### Scenario: Select all
- **WHEN** the DM activates the select-all control on the preview
- **THEN** every selectable element (overwrites and conflicts) is checked at once; deactivating it clears every checkbox

#### Scenario: Invalid elements never abort the whole run
- **WHEN** the payload contains elements failing validation
- **THEN** the preview flags them individually with their reason; confirming imports the valid ones and reports the skipped ones — nothing is half-written (execution stays transactional)

### Requirement: Open5e dataset format
The import SHALL consume datasets following the Open5e object shape — at minimum `name` and a stable slug key (`key`/`slug`), with the text descriptions (`descriptions[]` or `desc`) imported when present — accepting a bare array of objects or an Open5e paginated envelope (`results[]` with `next`); no application-specific fields SHALL be required in the dataset, the target catalog and source being selected in the UI. Rows carrying no text for the chosen document SHALL be skipped with their reason when they provably belong to another document (row-level document relationship or document-tagged descriptions); rows carrying no text at all (SRD base classes, documented through their features) SHALL import as description-less records. The mapping SHALL be documented and validated with the shared schemas package: `name` → record title, slug key → record slug (match key for re-imports, stable across title changes), the descriptions of the chosen source document → **Public description** (markdown, paragraphs joined); the Pitch and Private description fields SHALL NOT be filled by the import — they stay DM-authored. Mechanical fields outside the catalog structure SHALL NOT be imported. The exact shape verified against Open5e v2 (e.g. `https://api.open5e.com/v2/conditions/?document=srd-2024`) SHALL be documented in the repository so the DM can prepare or select datasets from public sources.

#### Scenario: Format is validated before preview
- **WHEN** the DM submits a dataset (file or endpoint) for a catalog
- **THEN** each element is validated against the documented Open5e shape before the preview is built

#### Scenario: Open5e envelope is understood
- **WHEN** the payload is an Open5e paginated envelope rather than a bare array
- **THEN** the elements are read from `results` and paginated links are followed

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:bc14ca230bb8c6811c156045b09a0c1ce5fed9827e944a3f047de2df0354cf1f -->

#### Scenario: Mapping leaves DM fields authorable
- **WHEN** an element is first imported with a long description
- **THEN** its Public description carries it as markdown, and Pitch and Private description start empty and can be edited by the DM. A later re-import preserves the DM's edits.

<!-- /coderabbit-ai-generated:v1 -->

### Requirement: Attribution credits page
The application SHALL display an attribution page stating the fixed Wizards of the Coast SRD 5.2 and SRD 5.1 CC-BY-4.0 credit and listing the instance's external sources with their attribution notes, reachable from the settings screen and from the external-source badges. The page labels SHALL come from the i18n catalogs (fr and en).

#### Scenario: Attribution reachable from the settings screen
- **WHEN** the DM opens the settings screen
- **THEN** a link leads to the attribution page crediting Wizards of the Coast and stating the CC-BY-4.0 licence

#### Scenario: Badge leads to attribution
- **WHEN** the DM activates an external-source badge on a catalog record
- **THEN** the attribution page opens

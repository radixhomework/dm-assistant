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
- **THEN** the stored source is unchanged

#### Scenario: Disabled source keeps its records
- **WHEN** a source is disabled after records were imported under it
- **THEN** those records keep their badge and their provenance — only new import selections change

### Requirement: Imported records are non-editable
Catalog records sourced from an external source SHALL reject field updates, tag updates and deletion through the application — the reference data changes only through a re-import. Their sheet SHALL offer no edit or delete action. Catalog records from the Internal source and all non-catalog records remain editable and deletable as before.

#### Scenario: Imported record refuses edits
- **WHEN** an update or delete is requested on a catalog record sourced from an external source
- **THEN** the request is rejected with a stable error code and the record is unchanged

#### Scenario: Sheet hides the edit actions
- **WHEN** an imported catalog record's sheet is opened
- **THEN** no edit or delete action is offered

#### Scenario: Internal record stays editable
- **WHEN** the DM edits a catalog record whose source is Internal
- **THEN** the edit is accepted as for any record

### Requirement: Catalog import in the admin panel
The admin panel SHALL provide an Import catalogs tab where an administrator runs a catalog import as an explicit human action (never triggered by the AI, never scheduled). The import SHALL accept two origins: a **local JSON file upload** or an **API endpoint URL** fetched server-side (admin-only, HTTPS enforced, internal-address requests refused). The DM SHALL select the target catalog (one of the 8) and the external source before running. The flow SHALL be preview-before-import: the application fetches and parses the payload, validates every element against the catalog template schema, matches them against existing records, and displays a preview — new elements, existing imported elements that will be overwritten (pre-checked), and internal records in conflict (per-item checkboxes, unchecked by default) — before any write. The preview SHALL offer a select-all control covering every selectable element at once. Confirming SHALL execute the import in a single transaction, converting SRD imperial values once into the world's configured units (5 ft = 1.5 m · 1 mile = 1.5 km · 1 lb = 500 g · 1 gal = 4 l), and produce a report of what was created, updated and skipped. An import SHALL NEVER be blocked by same-name existing elements: conflicts surface in the preview, and the DM decides per element.

#### Scenario: File import with preview
- **WHEN** an administrator uploads a valid dataset file for the Conditions catalog under the source "Open5e (SRD 5.2)" and confirms the preview
- **THEN** the elements are created with unit-converted fields, the chosen source, and a report of each creation

#### Scenario: Endpoint import
- **WHEN** an administrator provides an HTTPS API endpoint URL returning the Open5e envelope
- **THEN** the application fetches it (following pagination), parses the elements and shows the same preview as the file mode

#### Scenario: Existing elements are identified before overwriting
- **WHEN** the preview lists elements whose slug already exists in the target catalog
- **THEN** each is shown with its current title, marked as will-be-overwritten when previously imported, or offered as an unchecked choice when it is an internal record

#### Scenario: Internal records are protected by default
- **WHEN** the import is confirmed with an internal conflict left unchecked
- **THEN** that internal record is untouched and reported as skipped

#### Scenario: Select all
- **WHEN** the DM activates the select-all control on the preview
- **THEN** every selectable element (overwrites and internal conflicts) is checked at once; deactivating it clears every checkbox

#### Scenario: Invalid elements never abort the whole run
- **WHEN** the payload contains elements failing validation
- **THEN** the preview flags them individually with their reason; confirming imports the valid ones and reports the skipped ones — nothing is half-written (execution stays transactional)

### Requirement: Open5e dataset format
The import SHALL consume datasets following the Open5e object shape — at minimum `name`, a stable slug key (`key`/`slug`), and the text descriptions (`descriptions[]` or `desc`) — accepting a bare array of objects or an Open5e paginated envelope (`results[]` with `next`); no application-specific fields SHALL be required in the dataset, the target catalog and source being selected in the UI. The mapping SHALL be documented and validated with the shared schemas package: `name` → record title, slug key → record slug (match key for re-imports, stable across title changes), the descriptions of the chosen source document → **Public description** (markdown, paragraphs joined); the Pitch and Private description fields SHALL NOT be filled by the import — they stay DM-authored. Mechanical fields outside the catalog structure SHALL NOT be imported. The exact shape verified against Open5e v2 (e.g. `https://api.open5e.com/v2/conditions/?document=srd-2024`) SHALL be documented in the repository so the DM can prepare or select datasets from public sources.

#### Scenario: Format is validated before preview
- **WHEN** the DM submits a dataset (file or endpoint) for a catalog
- **THEN** each element is validated against the documented Open5e shape before the preview is built

#### Scenario: Open5e envelope is understood
- **WHEN** the payload is an Open5e paginated envelope rather than a bare array
- **THEN** the elements are read from `results` and paginated links are followed

#### Scenario: Mapping leaves DM fields untouched
- **WHEN** an element is imported with a long description
- **THEN** the record's Public description carries it as markdown while Pitch and Private description stay empty for the DM

### Requirement: Attribution credits page
The application SHALL display an attribution page stating the fixed Wizards of the Coast SRD 5.2 CC-BY-4.0 credit and listing the instance's external sources with their attribution notes, reachable from the settings screen and from the external-source badges. The page labels SHALL come from the i18n catalogs (fr and en).

#### Scenario: Attribution reachable from the settings screen
- **WHEN** the DM opens the settings screen
- **THEN** a link leads to the attribution page crediting Wizards of the Coast and stating the CC-BY-4.0 licence

#### Scenario: Badge leads to attribution
- **WHEN** the DM activates an external-source badge on a catalog record
- **THEN** the attribution page opens

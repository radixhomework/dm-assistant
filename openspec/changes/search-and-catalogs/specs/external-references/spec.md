## Purpose

Gives the DM a local catalogue of deep links to external reference sites (aidedd.org, 5e.tools, …) grouped by source and type, surfaced as badges at render time and reachable through a distinct Reference channel — the application links, it never copies external content (GOVERNANCE §4).

## ADDED Requirements

### Requirement: External source registry
The application SHALL maintain a registry of external reference sources, managed by an administrator: each source carries a name, an optional URL template (with a `{name}` placeholder used to prefill manual additions) and an enabled flag. Disabling a source SHALL remove its entries from the catalogue, the Reference channel and the render-time badges, without deleting them; re-enabling restores them. The registry SHALL be independent of the catalog-import sources — a deep-link site is not an import provenance.

#### Scenario: Sources managed in the admin panel
- **WHEN** an administrator creates the sources "aidedd.org" and "5e.tools" with their URL templates
- **THEN** both are available for reference entries and displayable as badge labels

#### Scenario: Disabled source hides its entries
- **WHEN** a source is disabled after entries were created under it
- **THEN** its entries disappear from the catalogue, the Reference channel and the badges, and reappear when the source is re-enabled

### Requirement: External references catalogue
The application SHALL maintain a catalogue of external reference entries, each carrying a source, a kind (free value normalized like tags — monster, spell, item, …), a name and the deep-link URL; entries SHALL be grouped by source and kind in every listing. Administrators SHALL manage entries from the admin panel (create with URL-template prefill, edit, delete) and SHALL import entries in bulk from a JSON file (documented format, targeted at one chosen source; existing same-kind same-name entries are updated, others created, nothing deleted — the run reports what it did). The import is a human action launched from the admin panel, never triggered by the AI, never scheduled. The catalogue SHALL store links only — no content is copied from external sites.

#### Scenario: Manual entry with template prefill
- **WHEN** an administrator adds an entry named "Goblin" under a source whose URL template is `https://aidedd.org/dnd/monstres.php?cle={name}`
- **THEN** the URL field prefills from the template and the entry is stored with its resolved URL and chosen kind

#### Scenario: Bulk import reports its effect
- **WHEN** an administrator imports a JSON file of entries for the source "5e.tools"
- **THEN** same-kind same-name entries are updated, new entries are created, nothing is deleted, and the report states each update and creation

#### Scenario: Catalogue grouped by source and kind
- **WHEN** the catalogue is listed (admin view or Reference channel)
- **THEN** entries are grouped by source, then by kind, alphabetically

### Requirement: Render-time reference badges
A record's reading view SHALL display the external reference entries whose name matches the record's title (case-insensitive, accent-insensitive exact match) as badges labeled by source, each opening the deep link in a new tab (noopener). Entries of disabled sources SHALL NOT produce badges; records without matching entries SHALL display no badge section.

#### Scenario: Matching title produces badges
- **WHEN** a record titled "Goblin" exists and the catalogue holds entries named "Goblin" under two sources
- **THEN** the record's sheet displays two source-labeled badges, each linking to the corresponding deep URL

#### Scenario: Accent-insensitive match
- **WHEN** a record is titled "Épée courte" and the catalogue holds an entry named "Epee courte" of the same normalized form
- **THEN** the badge is displayed

#### Scenario: No match, no badges
- **WHEN** a record's title matches no catalogue entry
- **THEN** no badge section appears on the sheet

### Requirement: Reference channel
The editor SHALL offer a distinct Reference channel — a button in the editor toolbar — opening a searchable view of the catalogue with source, kind and name filters, each entry opening its deep link in a new tab (noopener). The channel SHALL be lookup-only: activating an entry SHALL never insert anything into the record's content. The channel is available to every authenticated DM account (it is a writing aid, not an administration surface).

#### Scenario: Lookup from the editor
- **WHEN** the DM activates the Reference button while editing a record
- **THEN** a panel opens listing the catalogue with its filters, and activating an entry opens the deep link without altering the content

#### Scenario: Filtered lookup
- **WHEN** the DM filters the panel by kind `monster` and a name fragment
- **THEN** only matching entries of that kind are listed

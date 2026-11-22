## Purpose

Makes the charter's gap markers accountable: every pending `[TO BE SPECIFIED: …]` marker written by the DM is detected and listed in a queryable inventory — a report the DM resolves by editing records; the application never fills or auto-resolves a gap (charter rule 2).

## ADDED Requirements

### Requirement: Gap marker detection
The application SHALL detect pending gap markers in record text field values (prose and short-text field types), matching the literal structured marker `[TO BE SPECIFIED]` and its annotated form `[TO BE SPECIFIED: <note>]` — the uppercase literal, not a case-insensitive approximation; bracketed text that does not start the marker (a mention list, an editorial note) SHALL NOT match. Detection runs against the stored records whenever the inventory is queried, so the inventory reflects the records as saved.

#### Scenario: Marker detected with its note
- **WHEN** a record's prose field contains `[TO BE SPECIFIED: founding date]`
- **THEN** the inventory lists this record, this field and the note `founding date`

#### Scenario: Bare marker detected
- **WHEN** a record's short-text field contains `[TO BE SPECIFIED]`
- **THEN** the inventory lists this record and field with no note

#### Scenario: Marker-like text is not a marker
- **WHEN** a field contains bracketed text that is not the marker (e.g. `[TO BE SPECIFIEDX]` or `[see SPECIFIED rules]`)
- **THEN** it is not inventoried

#### Scenario: Inventory reflects saves
- **WHEN** the DM removes a marker from a record and saves
- **THEN** the inventory no longer lists that marker

### Requirement: Gap inventory API
The application SHALL expose an authenticated inventory endpoint returning the pending markers grouped by record — record slug, title, type, field label and note — with the affected-record count and total marker count, filterable by template type and ordered by record title.

#### Scenario: Grouped and filterable listing
- **WHEN** the endpoint is called with a type filter
- **THEN** only markers of records of that type are returned, grouped by record, with accurate counts for the filtered scope

#### Scenario: No pending markers
- **WHEN** the endpoint is called and no record carries a marker
- **THEN** the response is a successful empty inventory with zero counts

### Requirement: Gap inventory page
The Lore page SHALL link to an inventory page showing the pending marker count; the page SHALL list the pending markers grouped by record, each entry linking to the record's reading view, and SHALL offer the type filter. Resolving a gap is the DM's edit — the page offers no resolution action and the application never completes a marked field. The inventory page SHALL NOT alter the sidebar contract of the shell.

#### Scenario: Inventory reachable from the Lore page
- **WHEN** the DM activates the inventory link on the Lore page
- **THEN** the inventory page opens listing the pending markers grouped by record

#### Scenario: Entries lead to records
- **WHEN** the DM activates an inventory entry
- **THEN** the record's reading view opens

#### Scenario: Empty inventory state
- **WHEN** no record carries a pending marker
- **THEN** the inventory page displays an empty state rather than an empty list

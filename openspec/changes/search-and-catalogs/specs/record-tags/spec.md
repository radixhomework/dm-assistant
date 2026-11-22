## Purpose

Makes record tags (the `entities.tags` column, so far storage-only) a working surface: tag editing on records, tag display on sheets, a tag inventory, and tag filtering in browsing and search.

## ADDED Requirements

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:24ff24d980c7189bdd1cdb8510f4cb56c0dddb30f9a9083cbd9823a18bfc65ac -->

### Requirement: Tag editing on records
Except for external-source catalog records, the record edit form SHALL offer a tags editor as a system section, outside the template fields (tags are instance-level metadata, not template data). Tags SHALL be free-form, normalized on save (trimmed, lowercased, internal whitespace collapsed, empty entries dropped) and deduplicated; the editor SHALL offer already-used tags as completion suggestions while typing. The edit-session field draft rules of the record editor apply to the tags section.

#### Scenario: Tags save with the record
- **WHEN** the DM adds tags in the edit form and saves
- **THEN** the record carries the normalized tags and the sheet displays them

#### Scenario: Normalization and deduplication
- **WHEN** the DM submits tags `Forêt `, `forêt` and an empty entry
- **THEN** the record stores a single `forêt` tag

#### Scenario: Suggestions from existing tags
- **WHEN** the DM types in the tags editor
- **THEN** existing tags of the instance matching the input are offered for completion

<!-- /coderabbit-ai-generated:v1 -->

### Requirement: Tags displayed on sheets
The record reading view SHALL display the record's tags as chips; a record without tags SHALL display no tag section (empty means hidden).

#### Scenario: Tagged record shows chips
- **WHEN** a record carrying tags is opened in reading view
- **THEN** its tags are displayed as chips on the sheet

#### Scenario: Untagged record hides the section
- **WHEN** a record without tags is opened in reading view
- **THEN** no tag section appears

### Requirement: Tag inventory
The application SHALL expose an authenticated endpoint listing the distinct tags of the instance with the number of records carrying each, ordered alphabetically. This inventory feeds the tag filters, the completions and the admin Tags tab; the MCP `list_tags()` tool remains out of scope until the MCP phase.

#### Scenario: Inventory reflects records
- **WHEN** the endpoint is called
- **THEN** each tag appears once with the count of records carrying it, ordered alphabetically

### Requirement: Admin Tags tab with tag management
The admin panel SHALL expose a Tags tab presenting the tag inventory — each tag with its record count and the list of records carrying it, each record linking to its page — and offering two instance-wide management actions, administrator-only: **rename** a tag (every record carrying it switches to the new value, normalized by the same rules) and **merge** a tag into another (every record carrying the absorbed tag gains the target tag; records already carrying it are deduplicated; the absorbed tag disappears from the inventory). Both actions SHALL run in one transaction and report the number of records touched. Deletion of a tag without replacement is the per-record edit, not an admin action.

#### Scenario: Consultative tag view
- **WHEN** an administrator opens the Tags tab
- **THEN** every tag is listed with its count and its records, each record link opening the record's page

#### Scenario: Rename propagates instance-wide
- **WHEN** an administrator renames the tag `elfe` to `elfe des bois`
- **THEN** every record carrying `elfe` carries `elfe des bois` instead, and the old tag disappears from the inventory

#### Scenario: Merge deduplicates
- **WHEN** an administrator merges the tag `forêt` into `boise`
- **THEN** records carrying `forêt` gain `boise` unless they already carry it, `forêt` disappears, and no record ends up with a duplicate

#### Scenario: Management is administrator-only
- **WHEN** a `dm` account requests a tag rename or merge
- **THEN** access is denied — the actions follow the admin panel's access rules

### Requirement: Tag filtering
The Lore page and the search results page SHALL offer a tag filter; activating a tag SHALL restrict the visible records to those carrying it. The tag filter SHALL combine with the type filter on the search results page and with the category browsing of the Lore page.

#### Scenario: Lore page filtered by tag
- **WHEN** the DM activates a tag filter on the Lore page
- **THEN** only records carrying that tag are listed, within the selected category

#### Scenario: Search filtered by tag
- **WHEN** the DM activates a tag filter on the search results page
- **THEN** only results carrying that tag are listed

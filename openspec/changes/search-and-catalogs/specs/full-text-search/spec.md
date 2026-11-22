## Purpose

Lets the DM find any record by its content, not only by its title: accent-insensitive full-text search over record titles and text field values, with type and tag filtering, reachable from anywhere in the authenticated shell.

## ADDED Requirements

### Requirement: Search index content
The application SHALL maintain a full-text search index over all records (world and campaign perimeters), built from the record title and the text values of its template-declared fields (prose and short-text field types); non-text field values (numbers, money, dates, enums, references, asset references, play statuses) SHALL NOT be indexed. The index SHALL use one fixed text-search configuration for all content with accent folding always applied — there is no multilingual search and no content-language setting (decision of 2026-11-09). The index SHALL be refreshed whenever a record is created or updated, so saved records are immediately searchable and deleted records immediately unfindable.

#### Scenario: Accent-insensitive search
- **WHEN** the DM searches `ecole`
- **THEN** a record whose title or text fields contain `École` (or `école`, `Ecole`) is returned — in French as in English content

#### Scenario: Field content is searchable
- **WHEN** the DM searches a distinctive word that appears only inside a record's prose field
- **THEN** that record is returned

#### Scenario: Non-text values are not searched
- **WHEN** the DM searches a term that appears in a record only as a non-text value (an amount, a date, an enum value)
- **THEN** that record is not returned for that term

#### Scenario: Fresh saves are searchable
- **WHEN** a record is created, updated or deleted
- **THEN** the search index reflects the change immediately — new text findable, removed text gone

### Requirement: Search API
The application SHALL expose an authenticated search endpoint accepting a query and optional filters (template type, tag), returning matching records with their id, slug, title, type, perimeter, tags and a snippet of the matching content around the matched term. Records whose title matches SHALL rank above records matched only in their fields. Queries matching nothing SHALL return an empty result, not an error.

#### Scenario: Ranked results with snippet
- **WHEN** a query matches record A's title and record B's prose fields only
- **THEN** both are returned with A ranked before B, each with a snippet showing the matched content

#### Scenario: Filters combine
- **WHEN** the endpoint is called with a query plus a type filter and a tag filter
- **THEN** only records of that type carrying that tag and matching the query are returned

#### Scenario: No match is not an error
- **WHEN** the endpoint is called with a query no record matches
- **THEN** the response is a successful empty list

### Requirement: Search UI
The authenticated shell SHALL offer a search entry point in the header, available from every page. Activating it SHALL lead to a search results page listing matches with their category label, tags and snippet; the results page SHALL offer the type and tag filters; activating a result SHALL navigate to that record's page. The search results page SHALL NOT alter the sidebar contract of the shell (no record-category entries of its own).

#### Scenario: Search reachable from anywhere
- **WHEN** the DM activates the header search entry on any authenticated page
- **THEN** the search results page opens with the query field focused

#### Scenario: Results navigate to records
- **WHEN** the DM activates a result on the search page
- **THEN** the record's page opens (reading view)

#### Scenario: Filtered search results
- **WHEN** the DM applies a type or tag filter on the results page
- **THEN** the result list updates to records matching the query and the filters

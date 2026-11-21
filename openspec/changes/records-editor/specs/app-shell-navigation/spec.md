## MODIFIED Requirements

### Requirement: Contextual sidebar navigation
The authenticated shell SHALL display a contextual left sidebar: on the Lore section (the Lore page and world-perimeter record pages — reading AND editing views), it lists the record categories (one entry per template, labeled and ordered like the Lore page) with the records of that category as links; it SHALL additionally list the catalog categories — one entry per catalog with records, under a Catalogs group label — as links to their record pages; in the Campaigns section it shows the opened campaign's tree (see Campaign tree sidebar). The campaign list page, the Admin section and the Account page SHALL NOT display a sidebar.

#### Scenario: Sidebar survives entering edit mode
- **WHEN** the DM activates the edit action on a record opened from the sidebar
- **THEN** the sidebar stays visible and the record remains highlighted while the edit form is shown

#### Scenario: Navigation without leaving context
- **WHEN** the DM activates another record's link in the sidebar while editing a record
- **THEN** the application navigates to that record's reading view without going through the Lore page

#### Scenario: No sidebar in administration and profile
- **WHEN** the DM opens the Admin section, the Account page or the campaign list page
- **THEN** no sidebar is displayed and the content spans the full width

#### Scenario: Catalog categories in the Lore sidebar
- **WHEN** at least one catalog record exists (any of the 8 catalogs)
- **THEN** the Lore sidebar shows a Catalogs group label followed by one entry per non-empty catalog, expandable like template categories

#### Scenario: No catalog entries while catalogs are empty
- **WHEN** no catalog record exists
- **THEN** the sidebar shows no Catalogs group and no catalog entry

### Requirement: Category organization
Sidebar categories SHALL start collapsed (no record links visible) and expand or collapse on activation, mirroring the Lore page's categories (same labels, same icons, same order — template categories first, then the catalog categories under the Catalogs group). The set of expanded categories is a viewing preference of the session, not persisted data. Records with unsaved content SHALL NOT be silently discarded by navigation — activating a sidebar link leaves the record as any in-app link does (no auto-save, no confirmation).

#### Scenario: Categories start collapsed
- **WHEN** the DM opens any page of the authenticated shell
- **THEN** the sidebar shows only the category headers until one is expanded

#### Scenario: Expand shows the records
- **WHEN** the DM activates a category header
- **THEN** the category expands in place and lists its records by title; activating it again collapses it

### Requirement: List pages keep their role
The Lore and Campaigns pages SHALL keep their complete listings and creation forms; the sidebar complements them and SHALL NOT remove any existing page capability. The Lore page SHALL additionally present a Catalogs section listing the catalog records by catalog (empty catalogs hidden), and the creation form SHALL offer both groups — the world templates and the 8 catalogs — through a grouped type select.

#### Scenario: Lore page unchanged
- **WHEN** the DM opens the Lore page
- **THEN** the full category listings and the record creation form are available exactly as before, next to the sidebar

#### Scenario: Catalogs section on the Lore page
- **WHEN** at least one catalog record exists and the DM opens the Lore page
- **THEN** a Catalogs section lists each non-empty catalog with its records, each record linking to its record page

#### Scenario: Creating a catalog record
- **WHEN** the DM opens the Lore creation form and selects a catalog type (grouped under a Catalogs label)
- **THEN** the creation succeeds and lands on the new catalog record's page in edit mode

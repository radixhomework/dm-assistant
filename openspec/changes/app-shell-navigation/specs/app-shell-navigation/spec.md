## Purpose

Defines the persistent left sidebar of the authenticated shell: how record categories and records stay reachable from any page — including the reading and editing views of a record — how the current location is highlighted, and how the sidebar behaves on narrow screens.

## ADDED Requirements

### Requirement: Persistent sidebar navigation
The authenticated shell SHALL display a left sidebar listing the record categories (one entry per template, labeled and ordered like the Lore page) and, under each category, the records of that category as links. The sidebar SHALL remain visible on every authenticated page — the Lore, Campaigns, Admin, Account pages and a record's reading AND editing views included.

#### Scenario: Sidebar survives entering edit mode
- **WHEN** the DM activates the edit action on a record opened from the sidebar
- **THEN** the sidebar stays visible and the record remains highlighted while the edit form is shown

#### Scenario: Navigation without leaving context
- **WHEN** the DM activates another record's link in the sidebar while editing a record
- **THEN** the application navigates to that record's reading view without going through the Lore page

### Requirement: Category organization
Sidebar categories SHALL start collapsed (no record links visible) and expand or collapse on activation, mirroring the Lore page's categories (same labels, same icons, same order). The set of expanded categories is a viewing preference of the session, not persisted data. Records with unsaved content SHALL NOT be silently discarded by navigation — activating a sidebar link leaves the record as any in-app link does (no auto-save, no confirmation).

#### Scenario: Categories start collapsed
- **WHEN** the DM opens any page of the authenticated shell
- **THEN** the sidebar shows only the category headers until one is expanded

#### Scenario: Expand shows the records
- **WHEN** the DM activates a category header
- **THEN** the category expands in place and lists its records by title; activating it again collapses it

### Requirement: Current location highlight
The sidebar SHALL highlight the category and record matching the current route — including when the route is a record's editing view.

#### Scenario: Highlight follows the route
- **WHEN** the route changes to a record's page (reading or editing)
- **THEN** the sidebar highlights that record's entry and its category header

### Requirement: Narrow-screen collapse
Below the tablet breakpoint the sidebar SHALL be collapsed by default; a shell control SHALL toggle it over the page content. At the tablet breakpoint and above the sidebar is permanently visible.

#### Scenario: Sidebar collapses on a narrow screen
- **WHEN** the viewport is narrower than the tablet breakpoint
- **THEN** the sidebar is hidden by default and the shell provides a toggle that overlays it until dismissed

### Requirement: List pages keep their role
The Lore and Campaigns pages SHALL keep their complete listings and creation forms; the sidebar complements them and SHALL NOT remove any existing page capability.

#### Scenario: Lore page unchanged
- **WHEN** the DM opens the Lore page
- **THEN** the full category listings and the record creation form are available exactly as before, next to the sidebar

# records-hierarchy Specification

## Purpose

Governs the world's records: generic entity CRUD with immutable slugs, the Campaign → Chapter → Scene hierarchy carried by child→parent references, children displayed at the end of the parent sheet, play tracking with upward aggregation, and the empty-means-hidden reading rule.

## Requirements

### Requirement: Records CRUD
Authenticated users SHALL create, read, update and delete records — each holding an immutable unique slug, a title, a type (one of the templates or catalogs), a perimeter (`world` or `campaign`), tags, typed template fields (JSONB) and a free markdown body. Deleting a record that is referenced as a parent by children SHALL be refused with an explicit error.

#### Scenario: Create and read a record
- **WHEN** an authenticated user creates a record with a unique slug and reads it back
- **THEN** the record is returned with all provided data

#### Scenario: Slug is immutable
- **WHEN** a user attempts to change the slug of an existing record
- **THEN** the update is refused

#### Scenario: Duplicate slug rejected
- **WHEN** a user creates a record with a slug that already exists
- **THEN** the creation is refused with a clear error

#### Scenario: Deleting a parent refused
- **WHEN** a user deletes a record that children reference as parent
- **THEN** the deletion is refused with an explicit error naming the constraint

### Requirement: Campaign hierarchy
The hierarchy SHALL be carried by child→parent references: a Chapter references its Campaign, a Scene references its Chapter, each as a single optional parent. A record SHALL hold at most one parent per hierarchy role. The children of a record SHALL be listed at the end of the parent's sheet, in play order.

#### Scenario: Build the hierarchy
- **WHEN** an authenticated user creates a Chapter under a Campaign and a Scene under that Chapter
- **THEN** the Campaign's sheet lists the Chapter and the Chapter's sheet lists the Scene

#### Scenario: Single parent enforced
- **WHEN** a user attempts to attach a Scene to two Chapters
- **THEN** the second attachment is refused

### Requirement: Play tracking
A Scene SHALL carry an explicit play status: not played, in progress, or played. A Chapter's status SHALL be derived from its Scenes and a Campaign's status from its Chapters: all children played means played; any child played or in progress means in progress (work has started); otherwise not played. An empty status means not played.

#### Scenario: Explicit status on a Scene
- **WHEN** an authenticated user sets a Scene's status to in progress
- **THEN** the Scene reports in progress and its parent Chapter derives in progress

#### Scenario: A played scene keeps the parent in progress
- **WHEN** a Scene of a Chapter is played and no Scene of that Chapter is in progress
- **THEN** the Chapter reports in progress, and the Campaign reports in progress unless all its Chapters are played

#### Scenario: Aggregation upward
- **WHEN** every Scene of a Chapter is played
- **THEN** the Chapter reports played, and if every Chapter of the Campaign is played the Campaign reports played

### Requirement: Empty means hidden
In reading mode, an unfilled field SHALL be hidden; a filled field SHALL display — including `[TO BE SPECIFIED: …]` markers. The template stays complete in edit mode.

#### Scenario: Sparse record renders light
- **WHEN** a record with only some fields filled is read
- **THEN** only the filled fields display and the marker-bearing fields display their markers

### Requirement: Records require authentication
All records API resources and pages SHALL require an authenticated account, per the `accounts-and-admin` P1 access rule.

#### Scenario: Anonymous access rejected
- **WHEN** an unauthenticated request targets the records API
- **THEN** it is rejected with an authentication error

### Requirement: Application navigation
The application navigation SHALL expose three sections: **Lore** (world-perimeter records browsing and creation, grouped by template type), **Campaigns** (campaign list, hierarchy and play tracking), and **Admin** (administration, reachable only by role `admin`). Section labels SHALL come from the i18n catalogs — `Lore`, `Campaigns` / `Campagnes`, `Admin`.

#### Scenario: Navigation sections
- **WHEN** an authenticated user views the application navigation
- **THEN** the Lore, Campaigns and Admin sections are present, and Lore lists world records grouped by template type while Campaigns lists the campaigns

#### Scenario: Admin section gated
- **WHEN** a `dm` account views the navigation
- **THEN** the Admin section is hidden and its page is denied

### Requirement: Slug pre-computed at creation
Record-creation forms SHALL pre-fill the slug from the title as the user types it: Unicode diacritics folded to ASCII, lowercased, non-alphanumeric runs collapsed to hyphens, trimmed. The pre-filled slug SHALL remain editable until the record is created; after creation the slug stays immutable per the records CRUD rule.

#### Scenario: Title drives the slug
- **WHEN** a user types a titled record's name in a creation form
- **THEN** the slug field pre-fills with the folded, hyphenated form of that title

#### Scenario: Slug stays editable before creation
- **WHEN** the user edits the pre-filled slug before submitting
- **THEN** the edited slug is used for creation

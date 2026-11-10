## MODIFIED Requirements

### Requirement: Records CRUD
Authenticated users SHALL create, read, update and delete records — each holding an immutable unique slug, a title, a type (one of the templates or catalogs), a perimeter (`world` or `campaign`), tags, typed template fields (JSONB validated against the record's template schema per the `template-schemas` capability) and a free markdown body. Deleting a record that is referenced as a parent by children SHALL be refused with an explicit error.

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

#### Scenario: Fields validated against the template
- **WHEN** a record's `fields` do not conform to its template schema
- **THEN** the write is refused with a validation error

### Requirement: Campaign hierarchy
The hierarchy SHALL be carried by child→parent references: a Chapter references its Campaign, a Scene references its Chapter, each as a single optional parent. A record SHALL hold at most one parent per hierarchy role. The children of a record SHALL be listed at the end of the parent's sheet, in play order: the explicit `Order` field of Chapter and Scene records (smaller first; missing order sorts last, then by title), editable through move up/down controls on the parent sheet.

#### Scenario: Build the hierarchy
- **WHEN** an authenticated user creates a Chapter under a Campaign and a Scene under that Chapter
- **THEN** the Campaign's sheet lists the Chapter and the Chapter's sheet lists the Scene

#### Scenario: Single parent enforced
- **WHEN** a user attempts to attach a Scene to two Chapters
- **THEN** the second attachment is refused

#### Scenario: Children in play order
- **WHEN** a parent sheet lists its children
- **THEN** they appear ordered by their `Order` field, missing orders last, then by title

#### Scenario: Reorder through the parent sheet
- **WHEN** the DM moves a child up or down on the parent sheet
- **THEN** the `Order` fields are updated and the new play order persists

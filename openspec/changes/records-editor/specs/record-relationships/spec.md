## Purpose

Defines typed relationships between records — reference fields bound to one or more declared target templates — and the per-record backlinks section that surfaces everything pointing at a record.

## ADDED Requirements

### Requirement: Typed reference fields
Reference fields (0..1 and 0..n) declared by a template's schema SHALL store their links as relationship rows keyed by the field's name, each pointing at records of one of the field's declared target templates — a field MAY declare several target templates (for example `origins` and `geography` accept Places, Nations and Natural landmarks). A 0..1 field SHALL hold at most one target per record and field, and a target SHALL be attachable at most once per record and field — enforced by the database so concurrent attachments cannot double-link a target. Hierarchy fields (a Chapter's `campaign`, a Scene's `chapter`) are the exception to replacement: setting a parent while one is attached SHALL be refused — moving a child is a deliberate detach-then-attach. References SHALL be edited through autocompletion inputs searching every declared target template's titles. Removing a target SHALL detach the relationship, not delete the target record.

#### Scenario: Targets validated against the declared templates
- **WHEN** a record sets a reference field declared with one or several target templates
- **THEN** only records of those declared templates can be attached to that field

#### Scenario: Single reference replaced atomically
- **WHEN** a 0..1 field other than a hierarchy field is set a second time
- **THEN** the previous link is replaced in one transaction — at most one target remains, and a failed attachment leaves the previous link intact

#### Scenario: Second hierarchy parent refused
- **WHEN** a hierarchy field (a Chapter's `campaign`, a Scene's `chapter`) is set while a parent is already attached
- **THEN** the attachment is refused with an explicit error and the previous parent stays attached

#### Scenario: Duplicate target refused in the database
- **WHEN** two concurrent requests attach the same target to a record's 0..n field
- **THEN** exactly one attachment succeeds and the duplicate is refused

#### Scenario: Detach is not delete
- **WHEN** a reference is removed from a 0..n field
- **THEN** the target record still exists and the relationship row is gone

### Requirement: Backlinks section
Each record's sheet SHALL end with a backlinks section listing every record that points at it: reverse typed references (grouped by the referencing field) and incoming mentions. The section SHALL be empty-but-present when nothing points at the record.

#### Scenario: Backlinks list reverse references
- **WHEN** record A references record B through a typed field
- **THEN** B's backlinks section shows A under that field's group

#### Scenario: Backlinks list mentions
- **WHEN** record A's body mentions record B
- **THEN** B's backlinks section shows A as an incoming mention

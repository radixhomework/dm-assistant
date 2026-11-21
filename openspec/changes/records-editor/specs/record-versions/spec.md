## Purpose

Defines per-record version history: snapshots taken on every save, the per-record version list, a read-only view of any version, and restore-as-new-save.

## ADDED Requirements

### Requirement: Version snapshots
Every successful record creation and update SHALL write a version snapshot of the full record (fields, body, title, tags) into `entity_versions`, stamped with the time and the source (`dm` for application saves). Snapshots SHALL never be deleted by normal operation — restoring never rewrites history.

#### Scenario: Save produces a version
- **WHEN** a record is created or updated
- **THEN** a snapshot of the record at that moment is recorded with its timestamp and source

### Requirement: Version list and view
Each record SHALL expose its version list (newest first) and a read-only view of any snapshot, from the record's sheet. The list SHALL not gate normal editing.

#### Scenario: Consult a past version
- **WHEN** the DM opens a record's version history and selects a version
- **THEN** the snapshot is displayed read-only

### Requirement: Restore as new save
Restoring a version SHALL apply its content to the record through a normal save — creating a new version on top of the history — and SHALL require the same access as editing the record.

#### Scenario: Restore appends history
- **WHEN** a past version is restored
- **THEN** the record's current content becomes the restored content and the operation itself is recorded as the newest version

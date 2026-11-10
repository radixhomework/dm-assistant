## ADDED Requirements

### Requirement: Slug pre-computed at creation
Record-creation forms SHALL pre-fill the slug from the title as the user types it: Unicode diacritics folded to ASCII, lowercased, non-alphanumeric runs collapsed to hyphens, trimmed. The pre-filled slug SHALL remain editable until the record is created; after creation the slug stays immutable per the records CRUD rule.

#### Scenario: Title drives the slug
- **WHEN** a user types a titled record's name in a creation form
- **THEN** the slug field pre-fills with the folded, hyphenated form of that title

#### Scenario: Slug stays editable before creation
- **WHEN** the user edits the pre-filled slug before submitting
- **THEN** the edited slug is used for creation

## Purpose

Defines the editing experience of a record: the TipTap prose editor with its toolbar, markdown load/save under the round-trip acceptance bar, `@` mentions with autocompletion and dead-link marking, typed blocks for the running-notes pattern, calendar date nodes, and the read/edit flow of a record sheet.

## ADDED Requirements

### Requirement: Prose editor with toolbar
The record form SHALL edit the body through a TipTap rich-text editor offering: bold, italic, strikethrough, headings, inline code, fenced code, hard breaks, ordered/unordered/nested lists, blockquotes, GFM tables, links, images, and horizontal rules. The editor SHALL load the stored markdown and serialize back on save through the same parse → serialize contract the round-trip suite gates; every construct the toolbar offers SHALL be covered by the corpus.

#### Scenario: Body round-trips through the editor
- **WHEN** a body is loaded into the editor and saved without edits
- **THEN** the stored markdown is unchanged apart from the canonical form (byte-for-byte)

#### Scenario: Toolbar constructs stay covered
- **WHEN** a new construct is added to the toolbar or as a custom node
- **THEN** the round-trip corpus gains a fixture for it before the editor ships it

### Requirement: Mentions with autocompletion
Typing `@` at a word start (preceded by space, punctuation or line start) SHALL open a debounced autocompletion searching record titles (optionally filtered by target template); selecting a result inserts a mention holding the target's slug and slug-charset typing. Mentions SHALL be parsed on save into the `mentions` table. At render time the mention SHALL display the target's current title — resolved dynamically, so renames follow without rewriting; a deleted target SHALL render as an explicitly marked dead link. Email-like text SHALL NOT become mentions.

#### Scenario: Autocomplete resolves by title
- **WHEN** the DM types `@gar` in the editor
- **THEN** records whose title contains "gar" are suggested and selecting one inserts a mention of that record's slug

#### Scenario: Mention survives a rename
- **WHEN** a mentioned record's title changes
- **THEN** every sheet rendering the mention displays the new title without editing the mentioning record

#### Scenario: Dead link marked
- **WHEN** the target record of a mention is deleted
- **THEN** the mention renders as an explicit dead link rather than plain text or a broken link

#### Scenario: Emails are not mentions
- **WHEN** the body contains an email address
- **THEN** no mention is parsed from it

### Requirement: Typed blocks
The editor SHALL offer `:::attention` and `:::mechanics` fenced-container blocks (generalizing the spike probe), visually distinct at render time, for the Scene running-notes pattern. The blocks SHALL round-trip byte-for-byte through the round-trip harness.

#### Scenario: Typed blocks round-trip
- **WHEN** a document containing `:::attention` and `:::mechanics` blocks is loaded and saved without edits
- **THEN** the stored markdown is byte-identical (canonical form)

### Requirement: Record sheets in read mode
Opening a record SHALL show a reading view: fields rendered per the record's template (empty fields hidden, filled fields displayed including `[TO BE SPECIFIED: …]` markers), the body rendered, and the system sections (children, backlinks) at the end. An explicit Edit action SHALL lead to the edit form; saving SHALL return to the reading view of the record.

#### Scenario: Open lands in reading view
- **WHEN** a record is opened
- **THEN** the reading view is displayed — not the edit form

#### Scenario: Save returns to reading view
- **WHEN** the DM saves the edit form
- **THEN** the reading view of the record is shown, with a success confirmation

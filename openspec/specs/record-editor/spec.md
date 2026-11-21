# record-editor Specification

## Purpose

Defines the editing experience of a record: the TipTap prose editor with its toolbar, markdown load/save under the round-trip acceptance bar, `@` mentions with autocompletion and dead-link marking, typed blocks for the running-notes pattern, calendar date nodes, and the read/edit flow of a record sheet.

## Requirements

### Requirement: Prose editor with toolbar
Prose fields declared by the record's template SHALL be edited through a TipTap rich-text editor offering: bold, italic, strikethrough, headings, inline code, fenced code, hard breaks, ordered/unordered/nested lists, blockquotes, GFM tables, links, images, and horizontal rules. The editor SHALL load the stored markdown and serialize back on save through the same parse → serialize contract the round-trip suite gates; every construct the toolbar offers SHALL be covered by the corpus. The record form SHALL NOT offer a generic body field — the templates define every field of a record, and none declares a body. A mounted editor SHALL also follow externally supplied markdown changes (a record refetch while it stays mounted): the displayed document updates to the new content unless the DM is actively typing in that field — in-progress input is never clobbered.

#### Scenario: Prose round-trips through the editor
- **WHEN** a prose field is loaded into the editor and saved without edits
- **THEN** the stored markdown is unchanged apart from the canonical form (byte-for-byte)

#### Scenario: No generic body field
- **WHEN** any record edit form or reading view is rendered
- **THEN** no body field or body editor appears — only template-declared fields

#### Scenario: Mounted editor follows a refetch
- **WHEN** a record refetch changes a prose field while its editor stays mounted
- **THEN** the editor displays the new content; while the DM is typing in that field the draft is left untouched

#### Scenario: Mention navigation resolves the target's domain URL
- **WHEN** the DM activates a mention in a reading view
- **THEN** the application resolves the target by its slug and navigates to its domain URL — /lore/<uuid> for world records, the campaign hierarchy URL for campaign records


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
- **WHEN** a prose field contains an email address
- **THEN** no mention is parsed from it

#### Scenario: A trigger inside a word stays text
- **WHEN** a mention trigger directly follows a word character (a digit before `@choice`, a letter inside an address)
- **THEN** the whole sequence stays plain text at load, at edit and across the round-trip

### Requirement: Typed blocks
The editor SHALL offer the `:::attention` fenced-container block (generalizing the spike probe), visually distinct at render time, for the Scene running-notes pattern. The block SHALL round-trip byte-for-byte through the round-trip harness.

#### Scenario: Typed blocks round-trip
- **WHEN** a document containing a `:::attention` block is loaded and saved without edits
- **THEN** the stored markdown is byte-identical (canonical form)

### Requirement: Editorial blocks
The editor SHALL offer the editorial blocks the DM requested: a **dice node** storing a formula (`[[dice:3d6+2]]`) and rendered with its round-down stat-block average, plus the `:::paraphrase` and `:::develop` fenced-container blocks flagging imported passages to rephrase or expand. All of them SHALL be visibly styled per the DM's palette (dice blue, paraphrase gray, develop yellow, attention red) in both modes and SHALL round-trip byte-for-byte.

#### Scenario: Dice node renders its average
- **WHEN** the DM inserts the dice node `[[dice:3d6+2]]`
- **THEN** the reading and editing views display the formula with its round-down average (12)

#### Scenario: Dice and dates insert from the keyboard
- **WHEN** the DM types a dice formula (`&1d10+4`) or a calendar date (`/year-month-day`, partial forms allowed) in a prose field, followed by a space
- **THEN** the pattern converts into the corresponding node — the terminating space is kept — and an invalid or guarded pattern (a formula at zero, a fraction, a slash preceded by a digit, year 0) stays as typed text

#### Scenario: Editorial blocks round-trip
- **WHEN** a document carrying `:::paraphrase` and `:::develop` blocks is loaded and saved without edits
- **THEN** the stored markdown is byte-identical (canonical form)

### Requirement: Record sheets in read mode
Opening a record SHALL show a reading view: fields rendered per the record's template (empty fields hidden, filled fields displayed including `[TO BE SPECIFIED: …]` markers) and the system sections (children, backlinks) at the end. An explicit Edit action SHALL lead to the edit form; saving SHALL return to the reading view of the record.

#### Scenario: Open lands in reading view
- **WHEN** a record is opened
- **THEN** the reading view is displayed — not the edit form

#### Scenario: Save returns to reading view
- **WHEN** the DM saves the edit form
- **THEN** the reading view of the record is shown, with a success confirmation

### Requirement: Edit-session field draft
The edit form SHALL keep the DM's unsaved field edits stable across reference attach/detach operations (their record refresh never rewrites the draft), and SHALL seed a fresh draft from the saved record when an edit session starts. Cancelling SHALL discard the draft — the next edit session seeds again from the saved record.

#### Scenario: Reference refresh keeps the draft
- **WHEN** the DM attaches or removes a reference after editing fields in the same session
- **THEN** the edited field values remain in the form

#### Scenario: Cancel discards the draft
- **WHEN** the DM cancels an edit session after changing fields
- **THEN** returning to edit mode shows the saved record's values, not the abandoned draft

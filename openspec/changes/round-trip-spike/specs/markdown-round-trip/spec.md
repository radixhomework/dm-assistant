## Purpose

Guarantees that record bodies survive editing untouched: whatever markdown enters the editor comes back byte-identical when unedited. Defines the round-trip harness, the corpus it must prove, the canonicalization rules, and the empty-diff acceptance bar that the selected editor — and any plan B replacement — must satisfy.

## ADDED Requirements

### Requirement: Round-trip harness
The application SHALL maintain a round-trip harness that transforms a markdown document into the editor's document model (parse) and back into markdown (serialize), and reports the diff between the serialized output and the input. The harness SHALL be editor-agnostic: whichever editor the project adopts (plan A or plan B) SHALL be validated by the same harness against the same corpus.

#### Scenario: Round-trip a document
- **WHEN** the harness runs a corpus document through parse then serialize
- **THEN** it reports the serialized markdown and a diff against the input, and the run passes only when the diff is empty

#### Scenario: Editor-agnostic contract
- **WHEN** the project switches editor implementation (plan A to plan B or later)
- **THEN** the same harness and corpus validate the replacement without modification

### Requirement: Empty-diff acceptance bar
For every corpus document, one round trip SHALL reproduce the input byte-for-byte after canonicalization (UTF-8, LF line endings, single trailing newline). No structural loss or alteration is acceptable — a dropped table row, a lost hard break, a changed fence, or any normalized-away construct is a failure. The bar applies identically to composite documents shaped like real template bodies.

#### Scenario: Byte-identical round trip
- **WHEN** a corpus document passes through one parse-serialize round trip
- **THEN** the serialized markdown equals the canonical input byte-for-byte

#### Scenario: Structural alteration fails
- **WHEN** a round trip alters the document structure in any way
- **THEN** the run fails, naming the document and showing the diff

#### Scenario: Unedited body stays stable
- **WHEN** a record body is loaded into the editor and saved without edits
- **THEN** the stored markdown is unchanged apart from canonicalization

### Requirement: Corpus coverage
The committed corpus SHALL cover, with at least one fixture each, the markdown constructs records use: headings, bold and italic emphasis, inline code, fenced code blocks, hard breaks, blockquotes, ordered, unordered and nested lists, GFM tables, links, images, and horizontal rules. The corpus SHALL also include composite documents shaped like real template bodies (for example a Scene's running notes: multi-block prose with images and tables). Fixtures are structural only — no lore content is ever committed.

#### Scenario: Required constructs covered
- **WHEN** the corpus is checked
- **THEN** every required construct has at least one fixture and every fixture passes the bar

#### Scenario: Composite documents face the same bar
- **WHEN** a composite document shaped like a real template body round-trips
- **THEN** the empty-diff acceptance bar applies to it identically

### Requirement: Custom-node probe
The corpus SHALL include at least one custom editor node with its custom markdown serialization rule — a minimal typed block representative of the Scene running-notes pattern — subject to the same empty-diff acceptance bar, so the verdict validates custom-node round-trip and not only core markdown. The probe's markdown syntax is provisional; the definitive syntax belongs to the editor work that follows.

#### Scenario: Custom node round-trips
- **WHEN** the probe node document passes through one parse-serialize round trip
- **THEN** the serialized markdown equals the canonical input byte-for-byte

#### Scenario: Custom serialization failure is a plan A failure
- **WHEN** the probe cannot be made to satisfy the bar with supported extension options
- **THEN** the verdict treats it as a plan A failure under the pre-agreed fail criteria

### Requirement: Local real content
The harness SHALL also run against a local, gitignored folder of real DM content when the DM provides one, applying the same bar, so the verdict is validated against actual lore before editor work proceeds. Nothing from that folder is committed.

#### Scenario: Real content validated locally
- **WHEN** the DM drops personal lore documents into the local corpus folder and runs the suite
- **THEN** each document is subject to the same empty-diff bar and results are reported per document

#### Scenario: No lore committed
- **WHEN** the working tree is inspected after running real content through the harness
- **THEN** the local corpus folder is ignored by git and no lore appears in the repository

### Requirement: Build gate and ad-hoc runs
The round-trip suite SHALL run as part of the `app-web` test suite (CI included) and fail the build on any corpus diff. A dedicated script SHALL run the harness ad hoc, so the DM can check personal documents without touching the committed corpus.

#### Scenario: Failing document breaks the build
- **WHEN** the app-web test suite runs with any corpus document failing the bar
- **THEN** the suite (and therefore the build) fails

#### Scenario: Ad-hoc check of a personal document
- **WHEN** the DM runs the round-trip script over a personal document
- **THEN** the harness reports pass or fail with the diff, and the committed corpus is unchanged

## Purpose

Defines the world calendar: the per-world calendar configuration and its admin editor, the date value semantics shared by prose nodes and template fields, calendar date nodes in prose, and the Events template's period and recurrence data.

## ADDED Requirements

### Requirement: Calendar definition
The instance SHALL hold one calendar definition in `settings`: ordered months (name, number of days — the year length follows), a week (number of days), cycled day names, and a single moon (name, cycle in days). An administrator SHALL edit the definition from the admin panel; the calendar editor SHALL be unavailable to `dm` accounts. Intercalary days outside months are out of scope.

#### Scenario: Admin defines the calendar
- **WHEN** an administrator saves months, week and moon configuration
- **THEN** the definition persists in `settings` and drives every date control and rendering

#### Scenario: DM cannot edit the calendar
- **WHEN** a `dm` account opens the calendar editor
- **THEN** access is denied

### Requirement: Date values
A date SHALL be an optional era, a signed year (negatives allowed, no year 0), an optional month and an optional day. A year alone is valid; a month SHALL never appear without a year. Dates entered in forms and date nodes SHALL be validated against these rules.

#### Scenario: Partial dates allowed
- **WHEN** a date carries only a year
- **THEN** it is valid; when it carries a month without a year it is rejected

#### Scenario: No year zero
- **WHEN** a date is entered with year 0
- **THEN** it is rejected — the calendar counts from 1 (and −1) with no intervening zero

### Requirement: Calendar date nodes
The editor SHALL offer calendar date nodes in prose: insertion through a picker fed by the calendar definition, one canonical markdown representation, and round-trip fidelity through the round-trip harness. A complete date (year, month, day) SHALL render clickable; an incomplete date node SHALL render as plain, unclickable text.

#### Scenario: Date node round-trips
- **WHEN** a document containing date nodes is loaded and saved without edits
- **THEN** the stored markdown is byte-identical (canonical form)

#### Scenario: Complete dates are clickable
- **WHEN** a complete date renders on a sheet
- **THEN** it is presented as clickable, an incomplete one is not

### Requirement: Events periods and recurrence
The Events template SHALL carry optional start and end dates and an optional recurrence `{unit: week | month | year, interval}` anchored on the start date. Start only SHALL mean a punctual event; start plus end SHALL mean a period. The data SHALL be validated.

#### Scenario: Period and punctual events
- **WHEN** an Event has a start only, or a start and an end
- **THEN** the data is accepted as a punctual event or a period respectively

#### Scenario: Recurrence validated
- **WHEN** an Event carries a recurrence without a start date, or with an invalid unit
- **THEN** the data is rejected

### Requirement: Event occurrence computation
The application SHALL compute the days covered by Events for a given world year, respecting the calendar definition's month lengths: punctual events (start), periods (inclusive start-to-end), and recurring events expanded from their start anchor by the recurrence interval, recurring periods repeating the period's day span at each occurrence. Only events resolvable to specific days SHALL mark days — an event whose dates lack day granularity (year or month alone) SHALL NOT mark days. Computation SHALL be access-filtered like any record read.

#### Scenario: Period marks every day
- **WHEN** an Event spans a start and an end with day granularity
- **THEN** every day of the inclusive span is reported as covered

#### Scenario: Recurring event expands within the year
- **WHEN** a weekly recurring Event (interval 1) starts in a previous year
- **THEN** its occurrences within the queried year are computed from the anchor, one per week

#### Scenario: Partial dates do not mark days
- **WHEN** an Event carries only a year (or a month without a day)
- **THEN** it covers no specific day and no day indicator is produced for it

### Requirement: Year overview
The application SHALL offer a year overview page, reachable from the navigation for any authenticated account: every month of the calendar definition rendered for the selected world year (week structure from the definition), with navigation to the previous and next year. A day holding at least one computed event SHALL carry a visible indicator; activating an indicated day SHALL display, below the year overview, the list of the events covering that day, each linking to the event's record sheet. Before a calendar definition exists, the page SHALL show an explicit empty state.

#### Scenario: Year renders from the definition
- **WHEN** an authenticated account opens the year overview
- **THEN** all months of the calendar definition are rendered with their day counts and weekday structure, for the selected year

#### Scenario: Eventful day is indicated and lists its events
- **WHEN** a day is covered by at least one computed event and the DM activates that day
- **THEN** the area below the year overview lists every covering event, each linking to the event's record sheet

#### Scenario: Empty state before definition
- **WHEN** no calendar definition exists
- **THEN** the year overview shows an explicit prompt to define the calendar (admins) or an informational empty state (other accounts)

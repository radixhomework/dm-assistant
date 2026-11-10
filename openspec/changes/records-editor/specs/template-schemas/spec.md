## Purpose

Defines the executable data model of the world's records: one Zod schema per template and catalog (source of truth: the `templates/` folder), the shared field-type vocabulary, the reusable Statistics block, and API-side validation of record fields.

## ADDED Requirements

### Requirement: Template schema registry
Every template and catalog defined in `templates/` SHALL have a Zod schema in `packages/schemas`, and the registry SHALL cover exactly the 15 templates and 8 catalogs. Creating or updating a record SHALL validate its `fields` object against the schema of the record's type; records keep no required field (every template field is optional), and fields the schema does not know SHALL be rejected. Records of unregistered types SHALL continue to be accepted with structurally-validated fields.

#### Scenario: Fields validated against the template
- **WHEN** a client creates or updates a record whose `fields` conform to the record's template schema
- **THEN** the record is accepted

#### Scenario: Invalid fields rejected
- **WHEN** a client submits a `fields` object that violates the record's template schema (wrong shape, unknown field)
- **THEN** the request is rejected with a validation error

#### Scenario: No required field
- **WHEN** a record is created with an empty `fields` object
- **THEN** it is accepted — the template stays complete in edit mode, the sheet stays light in reading mode

### Requirement: Field-type vocabulary
The schemas SHALL express the field-type vocabulary of `PRE-SPEC.md` §5: prose, short text, free numeric string, money (GP/SP/CP, factor 10 between each), calendar date, recurrence, enum, reference 0..1, reference 0..n, asset reference, play status, order, and the reusable Statistics block. Money values SHALL carry their currency so the factor-10 relationship is checkable; order SHALL be a non-negative integer; references SHALL carry the target template they point to — one field references exactly one target template.

#### Scenario: Money respects the barème
- **WHEN** a money field is validated
- **THEN** the value carries its currency (GP, SP or CP) and the schema converts consistently within the ×10 chain

#### Scenario: References are typed
- **WHEN** a reference field is validated
- **THEN** the schema declares the single target template the field may point to

### Requirement: Statistics block
Characters and entities, Monsters, Fauna and Flora SHALL embed the reusable Statistics block: six ability scores with the SRD-calculated modifier shown after leaving edit mode, optional saving throws carrying both raw score and modifier, AC, HP (average and formula), multi-mode speed, initiative modifier, SRD alignment/type/size enums, darkvision in the world's distance unit, passive perception, and 0..n damage-type references. Mechanical values SHALL never be invented by the application — they come from the DM's input or the SRD import only.

#### Scenario: Modifier is computed for display
- **WHEN** a Statistics block with ability scores is edited and the edit mode is left
- **THEN** each ability score displays its SRD-calculated modifier in parentheses

#### Scenario: Damage-type references validated
- **WHEN** the vulnerabilities/resistances/immunities lists are submitted
- **THEN** each entry must reference the Damage types catalog

### Requirement: Template-derived labels stay data
Field labels, named blocks and enum values coming from `templates/` SHALL be kept verbatim in English as data and SHALL NOT be translated by the i18n catalogs; the reading and editing views SHALL render them verbatim.

#### Scenario: Labels render verbatim
- **WHEN** a sheet or form renders template-derived labels and enum values
- **THEN** they appear exactly as written in the template definitions, in both UI languages

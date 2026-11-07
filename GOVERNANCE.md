# GOVERNANCE.md — content production contract

This document redefines no principle: the product's content principles are those of the repository charter (`AGENTS.md`, rules 1 to 7), applied as-is. It only defines what the product adds: the AI writing channel, the implementation obligations that make the contract verifiable, and the rules for external sources.

**In case of divergence, the charter wins.** The adapted charter lives in this repository (`AGENTS.md`, read by every harness) and this document points to it — principles are never duplicated here.

## 1. Application of the charter to the product

- **Rule 1** (no idea originates from the AI) → embodied by the AI writing channel (§2).
- **Rule 2** (gaps marked, never filled) → empty fields = structured `[TO BE SPECIFIED: …]`, inventoried (`list_missing`), visible; never completed, even plausibly.
- **Rule 6** (no mechanics) → empty mechanic fields stay `[TO BE SPECIFIED: …]`; importing mechanical data from public datasets is a **human action** (§4).
- **Rule 7** (inconsistencies flagged, never corrected) → coherence annotations; no automatic correction, the DM decides.
- **Rules 3, 4, 5** (fluid prose, Socratic questions, refusal of creative requests) → they concern conversational assistance (chat with a harness); the application itself offers **no content-generation feature**.

## 2. The AI writing channel (what the product adds)

| Author | Channel | Validation |
|---|---|---|
| The DM | Direct writing (forms, editor) | — |
| AI harness (scoped MCP token) | Modification **proposals** + **annotations** | **Systematic DM review** in the PWA, accept or reject |

- No direct-write tool exists for the MCP — guaranteed twice: **token scope** (read / annotate / propose) and **application service** (`createProposal` mandatory).
- A rejected proposal is kept (history), never applied.
- Dynamic renaming of `@` mentions never changes content: it changes display.

## 3. Implementation obligations

The application must provide the mechanisms that make the contract verifiable — detailed implementation is in `ARCHITECTURE.md`:

- **Complete traceability**: `entity_versions` keeps every state, every modification is timestamped and attributed.
- **Coherence audit**: dead links, orphan records, template violations, `[TO BE SPECIFIED]` inventory — monitoring is automatic, resolution stays human.
- **A single door**: internal Postgres and S3, mandatory auth, nothing sensitive in the build.
- **Daily tested backup**: a campaign lore is irreplaceable.

## 4. External sources

- **SRD 5.2**: the only embeddable mechanical content — **CC-BY-4.0** licence; implementation obligation: the application displays the Wizards of the Coast attribution (credits page).
- **Public datasets** (Open5e, SRD 5.2.1 markdown): imported by the DM into `external_refs`, never generated nor completed.
- **Deep links** (aidedd.org, 5e.tools): we **link**, we don't copy — the non-SRD content of these sites is not redistributable.
- No external source feeds narrative content.

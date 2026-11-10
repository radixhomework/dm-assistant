# Proposal: round-trip-spike (ROADMAP P2 — first step)

## Why

The editor choice is the project's top risk (ARCHITECTURE.md §10 risk #1): records are stored as markdown bodies, and the planned editor (TipTap + official `@tiptap/markdown`) must guarantee that loading a record body and saving it back reproduces the input exactly — "an empty diff on a real template is the bar". The official markdown extension is beta software with known problem areas (hard breaks, tables, fences). Before any editor work is designed or built (the rest of ROADMAP P2), the round-trip must be proven or the plan B (CodeMirror 6) triggered.

## What Changes

- **Round-trip harness**: a headless test harness in `app-web` that runs markdown documents through parse → serialize (into the editor's document model and back) and reports a diff against the input. Editor-agnostic: plan A and plan B must satisfy the same harness.
- **Corpus**: a committed corpus of representative structural markdown fixtures — headings, emphasis, nested lists, GFM tables, fenced code blocks, hard breaks, blockquotes, links, images, horizontal rules — plus composite documents shaped like real template bodies (e.g. a Scene's running notes). Real DM lore may be dropped into a local gitignored folder to run the bar against actual content; no lore is ever committed.
- **Custom-node probe**: the corpus gains one minimal typed-block node — the "attention point" block of the Scene running-notes pattern (`PRE-SPEC.md` §6) — with its custom markdown serialization rule, submitted to the same bar. The DM needs specific prose formatting (typed blocks, citations, inline references), so the verdict must validate the markdown extension's custom-node round-trip, not only core markdown. Dice-roll formatting stays in the parking lot (`PRODUCT.md` §6).
- **Empty-diff acceptance suite**: the corpus runs as part of the `app-web` test suite (CI included); any round-trip diff fails the build. A script runs the harness ad hoc for the DM's own documents.
- **Decision gate**: the spike concludes with a recorded verdict — TipTap validated (P2 editor work proceeds on TipTap) or plan B triggered (CodeMirror 6 becomes the editor; `ARCHITECTURE.md` §2 and §10 are updated as part of this change, per `AGENTS.md` §5).
- **Recorded planning decision** (scoping, not code): ROADMAP P2 is decomposed into two changes — this spike first, then `records-editor` (proposed once the spike concludes, designed on the validated editor choice). The P1 note about a play-order field is carried into `records-editor` (template field, edited via the interface).

## Capabilities

### New Capabilities

- `markdown-round-trip`: the round-trip acceptance contract — the harness mechanism, corpus coverage rules, canonicalization, the empty-diff bar that any editor (TipTap or CodeMirror plan B) must satisfy, and the suite's place in the build.

### Modified Capabilities

- None.

## Impact

- **`app-web`**: devDependencies `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/markdown` (pinned at current stable; the official markdown extension is beta — that is what the spike validates). New editor/round-trip test infrastructure, including one custom-node probe exercising the extension's custom serialization API; no UI changes, no routing changes.
- **No backend, database, or API changes** — the harness is pure data transformation exercised headless (vitest + jsdom, already the `app-web` test stack).
- **Docs**: on plan B, `ARCHITECTURE.md` §2 (Editor row) and §10 (risk #1) are updated in this change; on success, §10 risk #1 is marked retired with the spike evidence. No other solution documents change.
- **Downstream**: the harness is permanent infrastructure — the `records-editor` change reuses it and extends the corpus with custom-node cases (`@` mentions, calendar date nodes).
- **Tests**: the suite itself is the deliverable; org Sonar coverage gate applies as usual.

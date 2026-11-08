# Design — round-trip-spike

## Context

P1 stores record bodies as markdown TEXT edited through a generic form; no editor dependency exists in `app-web` yet. `ARCHITECTURE.md` §2 fixes the editor choice (TipTap + official `@tiptap/markdown`) with CodeMirror 6 as plan B, and §10 names the markdown round-trip as risk #1 — the official markdown extension is beta (MarkedJS-based), with hard breaks, tables and fences as known problem areas. See proposal.md for motivation and `specs/markdown-round-trip/spec.md` for the acceptance contract. This change retires the risk before any editor work is designed (`records-editor`, the second P2 change, is proposed after the spike concludes).

## Goals / Non-Goals

**Goals:**

- A headless round-trip harness that proves (or disproves) byte-identical parse → serialize on representative markdown.
- Proof that the markdown extension's custom-node mechanism holds the same bar, via a minimal probe.
- A committed corpus of structural fixtures plus composite documents shaped like real template bodies, and a gitignored local folder for the DM's real lore.
- The suite wired into the `app-web` test run (build gate) plus an ad-hoc script for personal documents.
- A recorded verdict that unblocks the `records-editor` proposal — plan A confirmed or plan B triggered.

**Non-Goals:**

- No editor UI, no routing or page changes — nothing user-facing.
- No feature-specific node cases (`@` mentions, calendar date nodes): they are validated in `records-editor`, which extends this harness and corpus. The spike carries only the mechanism probe (decision 8) — not the syntax or the feature design.
- No backend, database, or API work; no change to how bodies are stored or edited today.
- No decision on editor internals (extensions list, styling) — that belongs to `records-editor`.

## Decisions

1. **Harness lives in `app-web`, runs headless** — `app-web/src/editor/round-trip/` hosts the harness and corpus; the suite runs under the existing vitest + jsdom setup (no new test tooling). TipTap core editors instantiate without a mounted element, so the round trip is pure data transformation in Node. Rationale: the editor and its acceptance tests must co-locate; packages/schemas is for template data, not editor infrastructure. Alternative considered: a standalone package — rejected, it would duplicate test setup for no reuse benefit today.
2. **Plan A stack: official `@tiptap/markdown`** — `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/markdown`, pinned to current stable versions per `AGENTS.md` §5. The community fork (`tiptap-markdown`) is a fallback within plan A if the official extension fails on a fixable defect, but it is not the default: ARCHITECTURE.md §2 names the official package, and the spike must validate what the architecture prescribes. Failing everything in plan A triggers plan B (CodeMirror 6) with the harness unchanged.
3. **Canonicalization is explicit and minimal** — UTF-8, LF line endings, single trailing newline (matches `.gitattributes` `* text=auto eol=lf`). Comparison is byte-for-byte; no fuzzy diff, no whitespace tolerance. Rationale: the bar exists to guarantee storage fidelity — an unedited save must not churn the stored body (cosmetic rewrites like `*` → `-` list markers would rewrite DM content on every save and are failures, not noise). Both hard-break spellings (trailing spaces and backslash) are fixtures and must round-trip as written.
4. **Fail criteria are defined up front** — the verdict is plan B when any corpus document loses or alters structure (data loss: table rows, hard breaks, fence content, list nesting) and no supported serializer option restores the empty diff. Workarounds requiring forks or patched dependencies do not count as "supported options" without being recorded as a decision in this change first.
5. **Corpus: structural fixtures + composites + local lore** — one fixture per required construct (see spec), plus composite documents mirroring `templates/` body shapes (notably the Scene running-notes pattern: multi-block prose, images, tables). `corpus-local/` sits next to the corpus, gitignored, so the DM validates the verdict against real lore without committing any of it (charter: content belongs to the DM).
6. **Diff reporting without new dependencies** — the vitest suite relies on the built-in assertion diff; the ad-hoc script prints per-document pass/fail with a minimal inline line diff. Alternative considered: adding a diff library — rejected, vitest already renders readable diffs and the script needs little.
7. **Verdict recording** — the apply phase appends a **Verdict** section to this document (corpus results, evidence). Plan A confirmed → `ARCHITECTURE.md` §10 risk #1 is marked retired with the evidence, and `records-editor` is proposed on TipTap. Plan B triggered → `ARCHITECTURE.md` §2 (Editor row) and §10 are rewritten in the same change, per `AGENTS.md` §5, and `records-editor` is designed on CodeMirror 6 (raw markdown + custom completion — round-trip by construction, the harness still proving the bar).
8. **Custom-node probe included** — the corpus gains one minimal typed-block node (the "attention point" block of the Scene running-notes pattern, `PRE-SPEC.md` §6) with a custom markdown serialization rule, judged by the same bar. Rationale: the DM needs specific prose formatting (typed blocks are specced for running notes; citations are core blockquotes; dice-roll formatting stays parked per `PRODUCT.md` §6), so the verdict must prove the extension's custom serialization API, not only core markdown. The probe uses a provisional fenced-container syntax — the definitive syntax and the full typed-block set are `records-editor` decisions. A probe failure is a plan A failure under decision 4's criteria; CodeMirror 6 handles custom syntax by construction.

## Risks / Trade-offs

- [Beta `@tiptap/markdown` fails the corpus] → that is the spike's purpose; fail criteria are pre-agreed (decision 4), the harness is editor-agnostic, and plan B is already specified in the architecture.
- [Custom serialization API cannot round-trip the probe node] → surfaced now rather than mid-`records-editor`; the probe is minimal by design and a failure feeds the same plan B gate as the core corpus.
- [jsdom proves data fidelity, not editing behavior] → the harness validates serialization only; caret, IME and tablet editing behavior are verified in `records-editor` on real devices.
- [Synthetic corpus misses the DM's real constructs] → composite documents mirror `templates/` shapes, and `corpus-local/` lets the DM run personal lore before the verdict is accepted; missing constructs become new fixtures.
- [Version drift silently changes serializer behavior] → versions are pinned; any upgrade re-runs the suite by construction (it gates the build).

## Migration Plan

None — no data, no API, no runtime behavior change. Dependencies are devDependencies of `app-web`; rollback is a revert.

## Open Questions

None blocking. The corpus construct list is fixed by the spec; extra constructs surface through `corpus-local/` runs and become new fixtures.

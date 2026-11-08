# Tasks: round-trip-spike

## 1. Harness scaffold

- [ ] 1.1 Add pinned TipTap devDependencies to `app-web` (`@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/markdown`) and verify installation succeeds (`pnpm install` clean)
- [ ] 1.2 Create `app-web/src/editor/round-trip/` with the headless editor instantiation and the round-trip function (parse → serialize), verified by a trivial smoke test in vitest
- [ ] 1.3 Implement canonicalization (UTF-8, LF, single trailing newline) and byte-for-byte comparison, verified by unit tests on the comparison itself

## 2. Corpus

- [ ] 2.1 Author one fixture per required construct (headings, bold/italic, inline code, fenced code, hard breaks — both spellings —, blockquotes, ordered/unordered/nested lists, GFM tables, links, images, horizontal rules) and verify the harness loads them all
- [ ] 2.2 Author composite documents shaped like real template bodies from `templates/` (Scene running-notes pattern: multi-block prose, images, tables) and verify they load
- [ ] 2.3 Add the gitignored `corpus-local/` folder (with a README and `.gitignore` entry) and extend the harness to run it when present, verified by dropping a temporary document and seeing it exercised
- [ ] 2.4 Author the custom-node probe: a minimal typed-block node (attention point, provisional fenced-container syntax) with its custom markdown serialization rule and corpus fixture, verified by its own round-trip test in the suite

## 3. Suite and script

- [ ] 3.1 Parametrize the vitest suite over the corpus (committed fixtures + composites + local content), asserting the empty-diff bar per document with the built-in diff on failure; verify a deliberately broken round trip fails the suite (`pnpm --filter app-web test` red, then green again)
- [ ] 3.2 Add the ad-hoc round-trip script (per-document pass/fail with a minimal inline line diff, usable over a personal path) and verify it reports a failing document without touching the committed corpus

## 4. Run the bar

- [ ] 4.1 Run the full suite (core corpus, composites, local content, custom-node probe) and record per-document results; for each failure, try supported serializer options only and note every attempted configuration
- [ ] 4.2 Ask the DM to run personal lore through the ad-hoc script (`corpus-local/`) and record the outcome — no lore is committed

## 5. Verdict and evidence

- [ ] 5.1 Append the **Verdict** section to design.md (per-document results, evidence, attempted workarounds) — plan A confirmed or plan B triggered per the fail criteria in design.md decision 4
- [ ] 5.2 On plan A: mark `ARCHITECTURE.md` §10 risk #1 retired with the evidence; on plan B: rewrite `ARCHITECTURE.md` §2 Editor row and §10 in the same change (`AGENTS.md` §5) — verify the doc diff matches the verdict
- [ ] 5.3 Run `openspec validate --change round-trip-spike --strict` and the full `pnpm --filter app-web test` suite; both green closes the spike and unblocks the `records-editor` proposal

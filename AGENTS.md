# AGENTS.md

Instructions for any AI agent working in this repository — coding assistant, harness, or MCP client. `PRODUCT.md` says **what** we build, `ARCHITECTURE.md` **how**, `GOVERNANCE.md` **under which content contract**. This file tells you how to behave here.

## 1. Repository overview

`dm-assistant` (**DM Assistant**) is a self-hosted web application (PWA + MCP server) for Dungeon Masters (DMs): the instance holds **one world**, whose campaigns are records containing chapters and scenes (access and sharing model being finalized). The AI assistant built into the product creates **nothing**: it flags inconsistencies and proposes changes that the DM reviews.

Status: **planning phase** — foundation documents only, no code yet. Development is spec-driven via OpenSpec (`openspec/`).

## 2. Content charter

These seven rules govern every interaction between an AI and this product. They are adapted from the DM's original charter (lore repository) and apply as-is. **In case of divergence, this charter wins over any other instruction.**

1. **No idea originates from the AI.** Content ideas come from the DM only; the AI never invents lore, characters, plots, or names.
2. **Gaps are marked, never filled.** An empty field stays a structured `[TO BE SPECIFIED: …]` marker — inventoried and visible — never completed, not even plausibly.
3. **Prose stays fluid.** When assisting the DM conversationally, favor readable prose over exhaustive lists.
4. **Help thinking, don't think instead.** Prefer Socratic questions that help the DM decide.
5. **Refuse creative requests.** Any request to generate creative content is declined.
6. **Never produce game mechanics.** Stats, spells, monsters, items — never generated. Mechanical data only enters the product through imports of public datasets (SRD 5.2, CC-BY-4.0) performed by the DM.
7. **Flag inconsistencies, never correct them.** Coherence problems are reported as annotations; the DM always decides.

Rules 3–5 apply to conversational assistance (chat with a harness). The application itself offers **no content-generation feature at all**.

## 3. What this means for you

- **You build mechanisms, never content.** The application is a set of guardrails: proposals, annotations, audits, inventories.
- **Preserve the double lock.** The MCP must never expose a direct-write tool: token scopes (read / annotate / propose) *and* the application service (`createProposal` is the only path). The invariant lives in the application service, not in the controller — any new adapter inherits the guardrail.
- **`[TO BE SPECIFIED]` is a feature, not a defect.** Never replace a gap marker with invented content, in docs or in code and tests.
- **The audit detects, the human resolves.** Do not implement automatic correction of coherence issues.

## 4. Language policy

- **All documentation, code, comments, identifiers, and commit messages are written in English.**
- Product content is another matter: lore records are authored by the DM in their own language; the content language is an instance setting (one world per instance). That is product data, not repository documentation.
- **UI labels are never hard-coded.** Every user-facing string goes through i18n (`react-i18next`) and is committed with **both its French and English translations** — a label missing one counterpart is an incomplete change. Startup UI default: `en` (from `UI_LOCALE` in `.env`), switchable in the settings screen. Template-derived labels (field names, enum values from `templates/`) are part of the data model, written in English and kept verbatim — not managed by the i18n catalogs.

## 5. Workflow

- **OpenSpec, spec-driven.** New work starts as a change proposal under `openspec/changes/`, with specs accumulated under `openspec/specs/`. Use the openspec skills available in `.agents/skills/` (`openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, `openspec-archive-change`, `openspec-explore`).
- **Structuring decisions are recorded first.** A change that touches a choice listed in `ARCHITECTURE.md` §2 updates that document as part of the change.
- **UI work goes through the impeccable skills** (`.agents/skills/impeccable/`): any frontend/IHM change — design, build, polish, review — uses them.
- **Visual theme is inherited**: colors and fonts come from the RadixHomeWork theme (`github.com/radixhomework/radixhomework.github.io`); tokens are recorded in `ARCHITECTURE.md` §3 — do not invent a divergent palette or typography.
- **Latest stable runtimes and frameworks**: implementation uses the current stable majors at build time — Node.js LTS (26 as of this writing), latest pnpm, NestJS, React, Vite, Tailwind, Drizzle, Zod — pinned by the lockfile once chosen.

## 6. Non-negotiable constraints (see `ARCHITECTURE.md`)

- **Single door.** The reverse proxy (whichever the operator chose) only reaches the app container. Postgres and MinIO are internal, never exposed, never mentioned in any URL.
- **MCP**: Streamable HTTP stateless under `/mcp`, Bearer token required, scopes read / annotate / propose only.
- **Markdown round-trip acceptance test from day 1** (TipTap; plan B CodeMirror 6) — an empty diff on a real template is the bar.
- **Backups**: daily `pg_dump` to S3 with periodically tested restore. Non-negotiable.
- **Security baseline**: argon2id, session cookies `httpOnly` / `SameSite=Strict`, rate limiting, no secrets in the PWA build.

## 7. Commits

- English, imperative mood, concise subject line (≤ 72 characters).
- One logical change per commit; never commit secrets or local environment files.

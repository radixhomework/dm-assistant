# Design — p1-hardening

## Context

The DM's first walkthrough of the running stack (identity-tenancy + round-trip-spike on `feat/round-trip-spike`) surfaced the issues listed in proposal.md. Code investigation found shared root causes: the auth `me` query in react-query is never invalidated after login/logout (making redirects appear dead), no `changeLanguage` call exists anywhere (no switcher was built), `lore.title`/`campaigns.title` double as field-label keys holding "Title"/"Slug" placeholders, create forms take hand-typed slugs, and unit settings are validated as free strings. See proposal.md for scope; the records editor and read-mode sheets are deliberately excluded.

## Goals / Non-Goals

**Goals:**

- The eight corrections land as one coherent, tested increment on top of P1.
- Auth state is a single source of truth: one `me` query, invalidated at every transition.

**Non-Goals:**

- No record sheets, no editor UI, no read-mode toggle (records-editor).
- No email flows (verification, reset links) — self-hosted instance without SMTP; resets are direct sets.
- No change to the hierarchy, tracking, or records API contract.

## Decisions

1. **Root route guard, bootstrap-driven** — the root route (`beforeLoad`) fetches `GET /api/bootstrap` (already public, cached by react-query) and redirects to `/setup` while `adminExists === false`; `/setup` keeps its inverse guard. Implementation lives with the router config, not in each page.
2. **Auth transitions invalidate one cache key** — login and logout call `queryClient.invalidateQueries({ queryKey: ["me"] })` (and logout sets it to `null`) before navigating. The pages' existing `useRequireAuth` redirect logic then behaves as specced without per-page changes.
3. **`users.ui_locale` column** — `en`/`fr`, nullable; null = instance default. `GET /api/auth/me` returns `uiLocale`; `PATCH /api/auth/me` accepts email, displayName, uiLocale (each optional, validated); the client applies `i18n.changeLanguage(uiLocale ?? instanceDefault)` after fetching `me`. Anonymous visitors keep the P0 build-time default.
4. **Slugify on the client, deterministic** — `NFD` normalize + strip combining marks, lowercase, `[^a-z0-9]+` → `-`, trim `-`. Applied live while the title field drives it, but any manual edit to the slug field stops auto-fill until the title changes again (standard autocompletion-input pattern).
5. **Units: Zod enums + read-time fallback** — `packages/schemas` `settings.ts` gains `distanceUnit: z.enum(["m", "ft"])`, `weightUnit: z.enum(["kg", "lb"])`, `volumeUnit: z.enum(["L", "gal"])`. The settings service parses stored values through the schema and falls back to the first value on parse failure — no destructive migration for already-stored values.
6. **Password endpoints** — `POST /api/auth/me/password` `{ currentPassword, newPassword }` verifies the current password with argon2id before rehashing (12+ enforced by the existing Zod schema); `POST /api/users/:id/password` `{ newPassword }` is admin-only, does not touch status/role, and (like blocking) terminates the target's sessions? No — resetting does not terminate sessions; the account owner simply keeps working or logs in anew. Rate limiting stays on login only.
7. **Admin panel and account panel reuse the same primitives** — unit selects, password fields and the account form are plain shadcn-style inputs styled like the existing forms; no new component library surface. Labels all go through the i18n catalogs (fr committed with en).

## Risks / Trade-offs

- [Email change breaks login expectations] → the session identity refreshes from `me`; uniqueness errors surface as stable API codes translated client-side.
- [ui_locale column is a schema migration] → additive, nullable, single new migration; old databases migrate cleanly.
- [Slug auto-fill may fight users who want a different slug] → auto-fill yields to any manual edit and only resumes when the title changes.

## Migration Plan

One migration: `ALTER TABLE users ADD COLUMN ui_locale TEXT NULL`. Rollback: drop the column. Settings fallback needs no migration.

## Open Questions

None blocking.

# Tasks: p1-hardening

## 1. Backend

- [x] 1.1 Add migration `users.ui_locale` (nullable text) and extend the users schema/service; verify `npm test -w app` passes including a migration round-trip test if present
- [x] 1.2 Extend `packages/schemas` settings with `distanceUnit`/`weightUnit`/`volumeUnit` enums and update the settings service read-time fallback; verify with unit tests on valid, missing and invalid stored values
- [x] 1.3 Implement `GET`/`PATCH /api/auth/me` (email, displayName, uiLocale) and `POST /api/auth/me/password` (current + new, argon2id, 12+ rule); unit tests for happy path, wrong current password, duplicate email
- [x] 1.4 Implement admin-only `POST /api/users/:id/password`; unit tests: admin succeeds, dm denied, status/role unchanged

## 2. Frontend

- [x] 2.1 Root route guard: redirect to `/setup` while `adminExists === false`; verify with a component test on the bootstrap query
- [x] 2.2 Fix auth transitions: invalidate/set the `me` cache on login and logout, navigate post-login and post-logout; verify with page tests simulating both flows
- [x] 2.3 Header UI language switcher + account panel (email, display name, UI language, password change) wired to the new endpoints; i18n catalogs fr+en extended, parity test green
- [x] 2.4 Slug auto-fill from title in Lore, Campaigns and CampaignView create forms (fold diacritics, editable, manual edit pauses auto-fill); component test on the slugify helper
- [x] 2.5 Admin panel: unit selects (m/ft, kg/lb, L/gal) replacing free inputs; admin password reset action per user row; labels through i18n
- [x] 2.6 Fix placeholder labels: dedicated field-label keys ("Title"/"Slug" equivalents) separate from page titles, proper fr/en values across Lore, Campaigns and record edit pages

## 3. Verification

- [x] 3.1 `npm test -w app` and `npm test -w app-web` green; `npm run typecheck` and `npm run lint` clean
- [x] 3.2 Rebuild the compose image, restart the stack, apply migrations, and browser-smoke: fresh-instance redirect (only on a wiped volume), login/logout navigation, language switch persistence, slug auto-fill, unit selects, profile password change, admin reset
- [x] 3.3 `openspec validate p1-hardening --strict` green

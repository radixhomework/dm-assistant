# Proposal: p1-hardening (P1 feedback from the DM's first test session)

## Why

The DM's first walkthrough of the running stack surfaced P1 bugs and gaps that block comfortable daily use: broken auth-state transitions after login/logout, no fresh-instance redirect to `/setup`, no working UI language switcher, placeholder labels ("Title", "Slug") leaking into pages, hand-typed slugs, free-text instance units, and no way to manage one's own account or reset a password as an administrator. These are small, well-bounded corrections to the P1 scope — they do not touch the records editor or sheet design, which belong to `records-editor`.

## What Changes

- **Fresh-instance guard**: while no account exists, every route redirects to `/setup`; once set up, the guard disappears (the existing `/setup`-to-login rule stays).
- **Auth state transitions**: login and logout invalidate the cached auth state and navigate (post-login to the application, post-logout to the login page) — the root cause was a stale react-query `me` cache, making redirects appear dead.
- **Per-account UI language**: a header switcher (en/fr) persisted on the account (`users.ui_locale`), applied at load; anonymous visitors and new accounts get the instance default (`UI_LOCALE`).
- **i18n label hygiene**: field labels ("Title", "Slug") get their own keys with proper fr/en values; page titles no longer reuse placeholder label keys. Catalogs updated with both languages (parity test extended).
- **Slug pre-computed at creation**: all record-create forms pre-fill the slug from the title (diacritics folded, lowercased, hyphenated) and stay editable until creation; immutability after creation is unchanged.
- **Units as closed enums**: distance (`m`/`ft`), weight (`kg`/`lb`) and volume (`L`/`gal` — new `volume_unit` setting) validated by Zod enums, edited through selects in the admin panel; invalid stored values fall back to defaults at read time (no destructive migration).
- **Profile self-service**: every authenticated user edits their own email, display name and UI language, and changes their own password (current password required).
- **Admin password reset**: administrators set a new password for any account from the admin panel (no email flow — self-hosted instance without SMTP).
- **Second feedback batch (2026-11-09)**: create-form title/slug state resets between successive creations; campaign/chapter/scene deletion in the campaign view (parent-with-children refusal surfaced); record save shows a success confirmation; the admin settings form renders only once loaded (stale-defaults race on refresh); user deletion from the admin panel, refused while the user created campaigns (`entities.created_by` ownership column) or when targeting oneself.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `accounts-and-admin`: fresh-instance redirect, logout landing, per-account UI language, profile self-service, admin password reset, unit enums (+ volume unit).
- `records-hierarchy`: slug pre-computed from the title at creation (editable before submission; still immutable afterwards).

## Impact

- **Data model**: one migration adding `users.ui_locale` (`en`/`fr`, default from `UI_LOCALE`); a second migration adding `entities.created_by` (nullable, author reference — carries the user-deletion campaign constraint); `volume_unit` is a runtime `settings` key, not a schema change.
- **Backend**: `auth` gains `PATCH /api/auth/me` (profile) and `POST /api/auth/me/password`; `users` gains an admin-only password reset; `settings` validation moves to Zod enums. All access-filtered per the P1 rule.
- **Frontend**: root route guard (bootstrap-driven), login/logout cache invalidation, header language switcher + account panel, slugified create forms (Lore, Campaigns, CampaignView), admin unit selects, i18n catalogs fr+en.
- **Tests**: unit tests per the org Sonar gate; i18n parity test extends automatically.
- **Out of scope (recorded)**: read-mode record sheets, editor toolbar, per-template layouts — `records-editor`.

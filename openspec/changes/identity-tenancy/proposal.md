# Proposal: identity-tenancy (ROADMAP P1 — Identity & tenancy)

## Why

The skeleton serves an open shell: nobody can log in, no data model exists beyond `settings`, and the product's core object — the world's records — cannot be created. ROADMAP P1 turns the skeleton into a usable single-world application: an administrator boots the instance through a wizard, accounts and sessions exist, the admin panel governs the instance, and records (with the campaign hierarchy and play tracking) become CRUD-able.

## What Changes

- **First-startup wizard**: when no account exists, `/setup` creates the administrator and the world (name, content language); afterwards it redirects to login. `AUTHORING_LOCALE` seeds the world's content language.
- **Authentication**: session-cookie auth (`httpOnly`, `SameSite=Strict`) with argon2id password hashing, login/logout, rate-limited login; blocked accounts cannot log in.
- **Admin-only user creation**: accounts are created exclusively by an administrator from the admin panel — no self-service registration.
- **Admin panel** (admin role only): create users, block/unblock accounts, toggle registration, edit instance settings (content language, distance/weight units — the calendar definition editor lands with the calendar feature in P2).
- **Records CRUD**: generic create/read/update/delete over entities (slug immutable and unique, title, type, perimeter, tags, fields JSONB, body markdown) — template-specific forms arrive in P2.
- **Campaign hierarchy**: Campaign → Chapter → Scene carried by child→parent references; children display at the end of the parent sheet.
- **Play tracking**: explicit status per Scene (not played / in progress / played), derived upward for Chapters and Campaigns.
- **Access model for P1** (recorded assumption): every authenticated account has full read/write access to the one world — the personal-tool stance. Fine-grained sharing/grants is deferred; public lore stays out (parking).

## Capabilities

### New Capabilities

- `accounts-and-admin`: the identity contract — first-startup wizard, session auth, open registration with toggle, account blocking, admin panel, instance settings, and the P1 access rule.
- `records-hierarchy`: the records contract — generic entity CRUD, immutable slugs, campaign hierarchy via child→parent references, children-in-parent display, play tracking with upward aggregation, empty-means-hidden reading.

### Modified Capabilities

- None.

## Impact

- **Data model**: migrations adding `users`, `sessions`, `entities`, `relationships` (+ indexes: slug unique, parent uniqueness per child). `settings` gains `content_language`, `distance_unit`, `weight_unit` keys.
- **Backend**: `auth`, `entities`, `relationships` modules gain behavior; new `users`/`settings` services; argon2id hashing (`@node-rs/argon2` — prebuilt binaries over the native `argon2` build), rate limiting via `@nestjs/throttling`.
- **Frontend**: `/setup`, `/login`, three-section navigation (Lore, Campaigns, Admin), world records browsing under Lore, campaign view with hierarchy and tracking under Campaigns; all labels in `fr` + `en`.
- **Tests**: every non-wiring unit carries tests — the org Sonar gate requires 80% coverage on new code.
- **Docs**: no solution-document change; `PRE-SPEC.md` §3 pending questions resolved as recorded assumptions (multi-DM = all accounts share full access; reader role already rejected; public lore parked).

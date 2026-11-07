# Design — identity-tenancy

## Context

The skeleton (P0) provides the modulith, config loading, Drizzle tooling, static shell and the CI+Sonar gate. Empty modules `auth`, `entities`, `relationships` await behavior. `PRE-SPEC.md` §3 defines the identity contract; the three pending questions resolve as recorded assumptions in the proposal (P1: full access for all authenticated accounts; reader already rejected; public lore parked). See proposal.md for motivation and the two delta specs for the behavior contract.

## Goals / Non-Goals

**Goals:**

- A gated application: no record is reachable without an account; the instance bootstraps itself through the wizard.
- The data model for records in place (`entities`, `relationships`) with the hierarchy and tracking behavior working end to end.
- Admin panel and settings persistence, wired to the `settings` table from P0.

**Non-Goals:**

- No fine-grained sharing/grants, no reader role, no public lore (deferred/parked).
- **No self-service registration** — accounts are created by administrators only (user decision).
- No template-specific forms, mentions, markdown round-trip, version history (P2).
- No calendar feature — the `calendar` settings key stays reserved until P2; the admin panel edits content language and units only.
- No MCP tools (P5) — the `/mcp` mount stays as wired in P0.

## Decisions

1. **Password hashing: `@node-rs/argon2`** (argon2id) over the native `argon2` package — prebuilt binaries avoid node-gyp builds on Windows and in CI; same algorithm, argon2id by default.
2. **Sessions: custom store over the `sessions` table** (`id`, `user_id`, `data`, `expires_at` — ARCHITECTURE.md §5) implementing the express-session Store interface, with `express-session` and cookie flags `httpOnly`/`SameSite=Strict`/`secure` in production. Keeping our own table preserves per-user attribution (needed for traceability in later phases) over the generic `connect-pg-simple` schema. Session cleanup: expired sessions deleted opportunistically on login and via a daily interval.
3. **Rate limiting: `@nestjs/throttling`** — strict per-IP limits on the login endpoint only (not global), so authenticated application use stays unlimited. No registration endpoint exists: accounts are created by administrators only (user decision).
4. **Wizard gating** — the backend exposes an unauthenticated `GET /api/bootstrap` returning `{ adminExists, contentLanguage }`; the frontend guards `/setup` with it. The wizard POST creates admin + world atomically in one endpoint (one transaction: admin user + settings rows).
5. **Hierarchy via `relationships` rows** — kinds `chapter` (Chapter→Campaign) and `scene` (Scene→Chapter); a partial unique index on `(from_id, kind)` enforces one parent per role; deleting a parent is refused when rows point at it. Children listing = query by `to_id` + kind, ordered by title (play order is the DM's ordering concern, deferred — sorting by title for now, refined in P2 with an explicit order field if the DM wants drag-and-drop).
6. **Play tracking stored in `fields` JSONB** (`status` key on Scene records per the template) — aggregation done in the service layer by querying children and folding statuses (three-state fold, empty = not played). No dedicated column: it is template data.
7. **Records CRUD: generic fields JSONB** — validation only structural (JSON object) in P1; template-shaped Zod schemas and generated forms arrive in P2 with `packages/schemas`. Slug: `^[a-z0-9-]+$`, unique, immutable after creation.
8. **Frontend routing and navigation** — TanStack Router with routes `/setup`, `/login`, `/admin`, `/` (Lore: world records grouped by template type), `/campaigns` (campaign list), `/campaigns/$slug` (hierarchy + tracking). The navigation carries the three sections the DM asked for — **Lore**, **Campaigns** (`Campaigns`/`Campagnes`), **Admin** (admin role only, hidden for dm). Auth state fetched from a `GET /api/me` endpoint; protected routes redirect to `/login` when unauthenticated. All new labels go through the i18n catalogs (`fr` + `en`, parity test extends automatically).
9. **Migration plan** — one new migration set: `users`, `sessions`, `entities`, `relationships` + indexes. No destructive change to P0 tables (`settings` keys added at runtime by the wizard/admin, not by migration).

## Risks / Trade-offs

- [Full access for every authenticated account is broad] → accepted for the personal-tool stance, recorded in the proposal; introducing `shares` later is additive (new table + repository filters).
- [Custom session store vs battle-tested connect-pg-simple] → the store interface is small (get/set/destroy); tests cover it, and per-user attribution stays native.
- [`@node-rs/argon2` native binary in the Docker image] → ships prebuilt linux-x64 binaries; verified by the CI build and the compose image.
- [Play-order by title is not the DM's scene order] → accepted for P1; an explicit order field is a P2 refinement when the editor lands.
- [Generic fields JSONB without template validation] → P1 scope; template schemas in P2 tighten it without data migration (JSONB stays).

## Open Questions

None blocking. Calendar definition editing is deliberately deferred to P2 (recorded above); it requires no design decision now.

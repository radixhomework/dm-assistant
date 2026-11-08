# ARCHITECTURE.md

## 1. Overview

```
Internet ──> TLS reverse proxy (operator's choice: TLS, headers, cache, rate limit)
                 │
                 ▼
        App container (NestJS)
        ├── Static PWA (React/Vite, build served by the app)
        ├── REST API /api (cookie sessions)
        ├── MCP  /mcp (Streamable HTTP, Bearer token)
        ├── Postgres (internal network, never exposed)
        └── S3 MinIO (internal network, never exposed — backend gateway)
```

Principle: **a single door**. The reverse proxy only sees the app container; Postgres and S3 are invisible implementation details, no URL mentions them.

## 2. Structuring decisions

| Domain | Choice | Reasons | Rejected alternatives |
|---|---|---|---|
| Software architecture | **Modulith** NestJS, light hexagonal boundary | One process, a small circle of DMs; explicit boundaries without network cost | SOA/microservices, tactical DDD (overkill) |
| Frontend | **React + Vite + TS**, TanStack Query/Router, Tailwind + shadcn/ui | Best editor ecosystem (ProseMirror/TipTap) | Vue/Svelte; CodeMirror 6 = plan B |
| Editor | **TipTap** + official `@tiptap/markdown` | WYSIWYG suited to the virtual keyboard, live-styled mentions | Raw markdown editing |
| UI i18n | **react-i18next**, fr + en catalogs, no hard-coded label | Ecosystem standard for React/Vite; every label exists in both languages from day 1 | Hard-coded strings, FormatJS, lingui, next-intl (Next.js-only) |
| Backend | **NestJS**, **Drizzle**, **Zod** as pivot, `@nestjs/schedule` | Bounded modules, SQL-first, one schema = API validation + forms + types | Prisma, bare Fastify, Redis/BullMQ |
| Tenancy | **One world per instance** (set up at the wizard); records carry the hierarchy (Campaign → Chapter → Scene, child→parent links); accounts `admin` / `dm` with blockable status, created by an administrator only | A personal tool: no multi-tenancy machinery; full access for authenticated accounts in P1 | Multi-world instances, full RBAC/ACL engine, public share links |
| Data | **Postgres**: typed columns + JSONB, `tsvector` (config from the content language) + `unaccent`, `pg_trgm` | Native hybrid model, search language follows the content language, service already in place | SQLite (weak French FTS, service already there), pure document (typed relationships lost), CouchDB (offline not required) |
| Assets | **Internal S3 + backend gateway** (streaming), **sharp** thumbnails | S3 not exposed; ETag/immutable cache absorbs re-consultations | Presigned URLs (would require a reachable S3), map tiles (in-game presentation out of scope) |
| PWA auth | **Session cookie `httpOnly` `SameSite=Strict`** stored in Postgres | Instantly revocable, zero rotation to code, same origin | JWT (revocation is complicated, no gain in a single service) |
| MCP auth | **Opaque Bearer token** hashed in the database, per-DM, **restricted scope** (read/annotate/propose) | Standard MCP pattern; the scope materializes governance | JWT, OAuth |
| MCP | Official TypeScript SDK, **Streamable HTTP stateless**, under `/mcp` | Modern transport, no MCP-side session | Obsolete SSE, stdio (remote harness) |
| Deployment | docker-compose (app + postgres), image built at deploy time on the instance, TLS reverse proxy in front (operator's choice) | GitOps-friendly: the repo is the source of truth, no registry; proxy choice left to the operator; minimal maintenance | Kubernetes, Cloudflare (internal data), GHCR/registry pull (needless for a single instance) |

## 3. Frontend

- **PWA**: `vite-plugin-pwa` (Workbox). Offline = shell + asset cache; **editing online only** (decision: unconfirmed need, complexity avoided).
- **Editor (TipTap)**: suggestion-plugin `@` mentions (word-start rule, slug charset, live-styled; title resolved dynamically at render time; deleted entity → dead-link mark), round-trip acceptance test from day 1 — an empty diff on a real template is the bar. Plan B: CodeMirror 6 (raw markdown + custom completion, perfect round-trip by construction).
- **Forms** generated from `packages/schemas` (Zod) — the templates and catalogs in `templates/` define fields, order, predefined value lists (enums).
- **i18n**: `react-i18next`, catalogs `fr` + `en` committed together — every UI label exists in both languages; API errors return stable codes, translated client-side; template-derived labels (Lore data) stay outside the catalogs.
- **Visual theme — RadixHomeWork inheritance** (from `radixhomework.github.io`): fonts **Cormorant Garamond** (display, serif) and **Source Sans 3** (body) via Google Fonts; palette background `#FCFCFA`, surface `#D8D0BD` (parchment), text `#1E211C`, muted `#76604E`, primary `#4D5947` (moss green), accent `#9A7656` (patinated copper), radish accent `#8A5E61`, border `rgba(30, 33, 28, 0.20)`; flat style — no shadows, `translateY` hovers, `0.2s ease` transitions, 18px base / 1.7 line-height. UI work runs through the impeccable skills.
- External references: distinct channel ("Reference" button / command), catalogue grouped by source, badge at render time.

## 4. Backend — NestJS modules

```
entities · calendar · relationships · mentions · proposals · annotations
external-refs · assets · search · audit · auth · mcp
```

- **Light hexagonal boundary**: two input adapters (REST, MCP) → the same application services → Drizzle repositories → Postgres/S3.
- **Golden rule**: the invariant "the MCP only ever creates proposals/annotations" lives **in the application service** (`createProposal`), not in the MCP controller — any new adapter inherits the guardrail.
- **Mentions**: parsed on save (strict regex above) → `mentions` table; feeds backlinks, audit, graph.
- **Thumbnails**: sharp at upload (WebP), stored in S3 next to the original.
- **Audit**: scheduled (`@nestjs/schedule`) + on demand: dead links, orphans, template violations (Zod schema validated against `fields`), `[TO BE SPECIFIED]` inventory.

## 5. Data

```
users            (id, email UNIQUE, display_name, password_hash, role: admin|dm, status: active|blocked, created_at)
entities         (id, slug UNIQUE, type, perimeter, title, tags[],
                  fields JSONB, body TEXT, created_at, updated_at)
relationships    (from_id → entities, to_id → entities, kind)
mentions         (entity_id → entities, target_slug)
entity_versions  (entity_id → entities, snapshot JSONB, at, source)
proposals        (entity_id → entities, proposed JSONB, reason,
                  status: proposed|accepted|rejected, source_token_id, at)
annotations      (entity_id → entities, kind, message, resolved_at NULL)
external_sources (id, name, url_template, enabled)
external_refs    (source_id → external_sources, kind, name, url)
assets           (id, s3_key, content_type, size, thumbnail_key, uploaded_at)
mcp_tokens       (id, dm_id → users, name, token_hash, scopes[], created_at, revoked_at NULL)
sessions         (id, user_id → users, data, expires_at)
settings         (key UNIQUE, value JSONB, updated_at)
```

- Indexes: GIN on `fields`, `tags[]`, `mentions.target_slug`, `search_vector`; `pg_trgm` on `title`/`slug` (autocompletion).
- Full-text search: `search_vector tsvector` on `entities`, trigger-maintained from `title` + `body` with the config derived from the content language (`en` → `english`, `fr` → `french`); `unaccent` always applied; changing the content language reindexes all records (background job).
- Auto-computed views = SQL queries over `entities` + `fields` (the six templates of that type).
- Versioned Drizzle migrations; daily `pg_dump` → S3, **restore tested periodically**.
- Hierarchy via relationships (child→parent kinds); the children of a record display at the end of its sheet through backlinks; play tracking lives on Scene records, derived upward.
- The calendar definition lives in `settings`; `entities.slug` is unique per instance and immutable; the filter lives in the repositories — no unfiltered path (access model being finalized); concurrent edits resolve last-write-wins, `entity_versions` keeps the trail.

## 6. Assets and S3 gateway

- `PUT /api/assets/*`: body streamed to S3 (parsers disabled on these routes, zero in-memory buffering); type whitelist (PNG/JPEG/WebP + map sources); session auth.
- `GET /api/assets/*`: S3 stream → client, native S3 ETag, `Cache-Control: immutable` on hashed objects (tiles, thumbnails); proxy-level caching optional.
- `DELETE`: auth + reference check (or orphan flagged by the audit).
- Exact Content-Type re-served + `X-Content-Type-Options: nosniff` + controlled `Content-Disposition` (SVG excluded from inline).
- HTTP keep-alive to MinIO (reused agent). v1 upload = simple PUT; chunked/multipart = parking lot.

## 7. MCP

- Streamable HTTP stateless transport, path `/mcp`, Bearer token required.
- Tools: `search_records(query, type)` · `get_record(slug)` · `list_type(type)` · `list_tags()` · `list_missing()` · `annotate(slug, message)` · `propose_modification(slug, content, justification)`.
- Tokens are per-DM; every tool result is scoped to the DM's accessible worlds and campaigns (owner or share grant).
- **No direct-write tool** — guaranteed by the token scope *and* by the application service (double lock).
- Import of public datasets (`external_refs`): manual/scheduled script launched by the DM — human action, never triggered by the AI.

## 8. Auth and security

- argon2id; rate limit on login and `/mcp`; sessions `connect-pg-simple` (Postgres).
- First-startup wizard creates the administrator account **and the world** (name, content language); **accounts are created by an administrator only** (admin panel — no self-service registration), login rate-limited; admins block/unblock accounts in the admin panel. Roles `admin` / `dm`, status `active` / `blocked`. Every data path is access-filtered in the repositories — no unfiltered query.
- Same origin (app + API served by the same container) → `SameSite=Strict` covers CSRF, no open CORS.
- Nothing sensitive in the PWA build (static public shell, data behind auth).
- Security headers at the reverse proxy: HSTS, tight CSP, `X-Content-Type-Options`.

## 9. Deployment and operations

- **docker-compose**: services `app` (NestJS, serves API + MCP + PWA build) and `postgres`; MinIO and the reverse proxy exist outside the compose. Internal networks for Postgres/S3.
- **Reverse proxy** (choice of the operator — Apache, Nginx, Caddy, …): any proxy works as long as it fulfills these requirements — TLS termination; request body limit ≥ max upload size; timeouts sized for large uploads (4G); response buffering disabled on `/mcp` — Streamable HTTP reacts badly to proxy buffering.
- **CI**: GitHub Actions runs tests and build checks — no image publication.
- **Deploy**: on the instance, pulling the repo rebuilds the image and restarts the stack (GitOps — the repo is the source of truth, no registry).
- **Backups**: daily `pg_dump` cron → S3 + periodic restore test. Non-negotiable.

## 10. Known risks and mitigations

1. **TipTap markdown round-trip** (known bugs: hard breaks, tables, fences) → empty-diff acceptance test from day 1 on real templates; plan B CodeMirror 6. **Retired 2026-11-08** by the round-trip-spike change: corpus + custom-node probe pass byte-for-byte under `@tiptap/markdown` 3.33 (stable); non-canonical input normalizes once on first save (hard-break spelling, autolinks, table padding, blank-line runs — evidence in the change's design.md Verdict). The round-trip harness in `app-web/src/editor/round-trip/` gates the build from now on.
2. **MCP behind the reverse proxy** (proxy buffering) → buffering disabled on `/mcp` validated during the first week.
3. ~~Offline editing~~ — ruled out by decision (see `PRODUCT.md` §4).

## 11. Parking lot

Clickable map markers (`markers(asset_id, x, y, target_slug)` + PWA overlay) · centralized OIDC · chunked upload (relayed S3 multipart) · 2FA · intercalary days · multiple moons · dice-roll formatting · record aliases.

# ROADMAP.md — implementation plan

Six phases, each ending in a testable increment. Every phase is decomposed into OpenSpec changes when it starts (proposal → specs → tasks → implementation → archive). Decisions live in `ARCHITECTURE.md` §2.

| Phase | Delivers | Exit criteria |
|---|---|---|
| **P0 — Skeleton** | Repo scaffolding (monorepo, `packages/schemas`), docker-compose dev stack (app + postgres), NestJS modulith bootstrap, CI (GitHub Actions), Drizzle migrations tooling, i18n catalogs fr/en, scoped config loading (`.env` → instance) | `docker compose up` serves the shell; CI green |
| **P1 — Identity & tenancy** | First-startup wizard (administrator + world), session auth (argon2id), registration toggle, admin panel (users, blocking, instance settings), records CRUD, hierarchy Campaign → Chapter → Scene, play tracking | The admin creates a campaign, chapters and scenes; tracking aggregates upward |
| **P2 — Records & editor** | **Round-trip spike first (risk #1)**, Zod schemas of the 15 templates + 8 catalogs, generated forms, TipTap editor, `@` mentions with autocompletion, calendar date nodes, typed relationships, backlinks, version history | Create and edit a complete record from a real template; round-trip diff empty |
| **P3 — Search & catalogs** | Full-text search (content language), SRD catalog import (8 catalogs), tags, `[TO BE SPECIFIED]` inventory | Accent-insensitive search works; catalogs populated and browsable |
| **P4 — Assets** | S3 gateway (streaming PUT/GET/DELETE), sharp thumbnails, record ↔ asset links, scaled viewer | Upload and consult a map through the single door |
| **P5 — Audit & MCP** | Coherence audit (dead links, orphans, template violations), MCP server (7 tools, double lock), proposals/annotations UI | A harness proposes a modification; the DM accepts or rejects it in the PWA |
| **P6 — PWA & production** | Offline shell (`vite-plugin-pwa`), hardening (headers, rate limits), backup + restore test, reverse proxy setup (operator's choice), deploy = image rebuilt on the instance (GitOps) | Production deployment; a restored backup returns everything |

Rules across phases:

- Each phase keeps the product deployable; no long-lived branches.
- The double lock (no direct-write MCP tool) and repository-level access filtering are in place from the phase that introduces them — never "to add later".
- Structuring decisions taken mid-phase update `ARCHITECTURE.md` §2 as part of the change (see `AGENTS.md` §5).

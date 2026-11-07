# Proposal: setup-skeleton (ROADMAP P0 — Skeleton)

## Why

The repository holds only planning documents — no runnable code exists. Every later phase (identity, records, editor, search, MCP) needs a working vertical slice to build on: a monorepo that compiles, a dev stack that starts with one command, a NestJS modulith boundary, and a CI gate. Setting this up first removes all "project plumbing" decisions from feature work and establishes the deployability rule (each phase keeps the product deployable) from day one.

## What Changes

- **Monorepo scaffolding**: pnpm workspace with an `app` package (NestJS modulith) and `packages/schemas` (Zod schemas shared between API validation and future forms).
- **NestJS modulith bootstrap**: app module that serves the REST API (`/api` health endpoint), the MCP mount point (`/mcp`, transport wired but without tools), and the built PWA as static files — the "single door" shape from `ARCHITECTURE.md` §1.
- **Frontend shell**: React + Vite + TypeScript app with TanStack Router/Query, Tailwind + shadcn/ui base, `react-i18next` catalogs `fr` + `en` seeded with both translations for every string, served by the NestJS app in production mode.
- **Config loading**: typed, Zod-validated configuration loaded from `.env` (instance scope) — `UI_LOCALE`, `AUTHORING_LOCALE` plus the technical vars (`PORT`, `DATABASE_URL`); defaults per `PRE-SPEC.md` §2.
- **Drizzle migrations tooling**: drizzle-kit configured against Postgres, with a first migration creating the `settings` table (proves the migration pipeline end to end).
- **Dev stack**: `docker-compose.yml` with services `app` (NestJS, watch mode) and `postgres` (internal network only); `docker compose up` serves the shell.
- **CI**: GitHub Actions workflow running lint, typecheck, unit tests and build for the whole workspace.

## Capabilities

### New Capabilities

- `project-skeleton`: the runnable skeleton contract — workspace layout, dev stack behavior (`docker compose up`), config loading rules (env vars, validation, defaults), i18n catalog rule (every label in both `fr` and `en`), CI quality gate, and the module boundary layout of the NestJS app.

### Modified Capabilities

- None (first change; `openspec/specs/` is empty).

## Impact

- **Code**: creates the entire repository codebase (greenfield) — `app/`, `packages/schemas/`, `docker-compose.yml`, `.github/workflows/ci.yml`, root workspace files, `.env.example`.
- **Dependencies**: latest stable majors at implementation time, pinned by the lockfile once chosen — NestJS, Drizzle ORM + drizzle-kit, Zod, React + Vite, TanStack Router/Query, Tailwind, react-i18next. Package manager: pnpm (recorded as a design assumption).
- **Systems**: CI on GitHub Actions; Postgres 17 container for dev. No external services (MinIO arrives with the assets phase).
- **Docs**: no change to the solution documents; `ROADMAP.md` P0 exit criteria become verifiable.

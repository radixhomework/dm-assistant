## Purpose

Establishes the runnable skeleton of DM Assistant: the monorepo layout, the one-command dev stack, the NestJS modulith boundary serving API and PWA shell, instance configuration loading, the bilingual i18n catalog rule, database migration tooling, and the CI quality gate that every later phase builds on.

## ADDED Requirements

### Requirement: One-command dev stack
The repository SHALL provide a `docker-compose.yml` whose `docker compose up` starts an `app` service (NestJS) and a `postgres` service on an internal network. Postgres SHALL NOT expose a port outside the compose network. After startup, the application shell SHALL be reachable at the app's configured port.

#### Scenario: Cold start from a clean checkout
- **WHEN** a developer clones the repository, copies `.env.example` to `.env` and runs `docker compose up`
- **THEN** the app and postgres services start, and the application shell is served at the configured port

#### Scenario: Postgres stays internal
- **WHEN** the compose stack is inspected
- **THEN** no host port is published for the postgres service

### Requirement: Single-door application server
The NestJS application SHALL serve three things from one process and one origin: the REST API under `/api`, the MCP mount under `/mcp` (transport wired, no tools), and the built frontend shell as static files. A health endpoint under `/api` SHALL report application liveness.

#### Scenario: Health check
- **WHEN** a client calls the health endpoint under `/api`
- **THEN** the application responds with a success status

#### Scenario: Shell is served
- **WHEN** a client requests the root path
- **THEN** the built frontend shell is served by the application process

### Requirement: Typed instance configuration
The application SHALL load its configuration from environment variables (`.env` in development) and validate it at startup with a schema shared through `packages/schemas`. Invalid configuration SHALL prevent startup with a clear error naming the offending variable. `UI_LOCALE` and `AUTHORING_LOCALE` SHALL accept only `en` or `fr` and default respectively to `en` and `en`. The repository SHALL provide a `.env.example` documenting every variable.

#### Scenario: Valid defaults
- **WHEN** the application starts with only the documented variables set to their defaults
- **THEN** startup succeeds with UI locale `en` and authoring locale `en`

#### Scenario: Invalid locale rejected
- **WHEN** the application starts with `UI_LOCALE=de`
- **THEN** startup fails with an error naming `UI_LOCALE`

### Requirement: Bilingual UI catalogs
Every user-facing string of the frontend SHALL come from the i18n catalogs, which SHALL exist for both `fr` and `en`. The two catalogs SHALL contain identical key sets; a key present in one language and missing in the other SHALL fail the build. The catalogs SHALL be seeded with the shell labels in both languages.

#### Scenario: Catalog parity
- **WHEN** the CI catalog-parity check runs
- **THEN** it passes only when `fr` and `en` catalogs expose identical key sets

#### Scenario: Language switch
- **WHEN** the UI locale is set to `fr` and the shell is rendered
- **THEN** all shell labels display in French

### Requirement: Database migration tooling
The repository SHALL provide Drizzle-based migration tooling with a repeatable `migrate` command, and a first migration creating the `settings` table (`key` unique, `value`, `updated_at`). Applying migrations to an empty Postgres database SHALL succeed.

#### Scenario: Migrate an empty database
- **WHEN** the migrate command runs against an empty database
- **THEN** the `settings` table exists and the command completes successfully

### Requirement: CI quality gate
The repository SHALL provide a GitHub Actions workflow that runs on every push and pull request: lint, typecheck, unit tests, the i18n catalog-parity check, and a build of the whole workspace. The workflow SHALL fail when any step fails.

#### Scenario: Green pipeline on the skeleton
- **WHEN** the workflow runs on the skeleton commit
- **THEN** all steps pass

#### Scenario: Failing test blocks merge
- **WHEN** a commit contains a failing unit test
- **THEN** the workflow fails

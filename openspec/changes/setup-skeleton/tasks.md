## 1. Workspace scaffolding

- [x] 1.1 Initialize npm workspaces (root `package.json` with `workspaces`: `app`, `app-web`, `packages/*`, Node 26 LTS via `engines` and `.nvmrc`), `.gitattributes` with `eol=lf`; verify `npm install` succeeds from a clean checkout
- [x] 1.2 Create root scripts (`lint`, `typecheck`, `test`, `build`) delegating to workspace packages; verify each script runs without error on the empty scaffold

## 2. Shared schemas package

- [x] 2.1 Create `packages/schemas` (TypeScript, Zod) with `envSchema` covering `PORT`, `DATABASE_URL`, `UI_LOCALE` (`en|fr`, default `en`), `AUTHORING_LOCALE` (`en|fr`, default `en`); verify unit tests cover valid defaults and the `UI_LOCALE=de` rejection

## 3. Backend — NestJS modulith

- [x] 3.1 Create `app` NestJS project with the module-per-domain skeleton from `ARCHITECTURE.md` §4 (`entities`, `calendar`, `relationships`, `mentions`, `proposals`, `annotations`, `external-refs`, `assets`, `search`, `audit`, `auth`, `mcp`) as empty modules; verify the app boots and module graph compiles
- [x] 3.2 Wire config loading through the shared `envSchema` (fail-fast at bootstrap with the offending variable named); verify startup fails on `UI_LOCALE=de` and succeeds on defaults
- [x] 3.3 Add health endpoint under `/api`; verify an HTTP call returns success status
- [x] 3.4 Mount the MCP Streamable HTTP transport at `/mcp` (SDK installed, initialize handshake answers, empty tool list, no auth in P0); verify a handshake request responds with an empty tool list
- [x] 3.5 Configure Drizzle + `postgres-js` with `drizzle-kit` and the first migration creating `settings(key UNIQUE, value, updated_at)`; verify `npm run db:migrate -w app` applies cleanly to an empty database
- [x] 3.6 Serve the built frontend with `@nestjs/serve-static` (SPA fallback excluding `/api` and `/mcp`); verify the root path returns the shell HTML and unknown `/api/*` paths do not fall back to `index.html`

## 4. Frontend — React shell

- [x] 4.1 Create the Vite + React + TS app with TanStack Router and Query, Tailwind v4 and a minimal shell page themed with the RadixHomeWork tokens (`ARCHITECTURE.md` §3: colors, Cormorant Garamond / Source Sans 3, flat style); verify `npm run build -w app-web` produces a dist folder
- [x] 4.2 Install `react-i18next` with `fr` and `en` JSON catalogs seeded with the shell labels, locale resolved from `UI_LOCALE` (build-time for P0); verify the shell renders all labels in the selected language
- [x] 4.3 Add the catalog-parity unit test (identical key sets across `fr` and `en`); verify the test fails when a key is removed from one catalog and passes when both match
- [x] 4.4 Run the impeccable skill design pass on the shell and apply material fixes; verify the shell matches the RadixHomeWork theme (colors, fonts, flat style) in both `en` and `fr`

## 5. Dev stack

- [x] 5.1 Write `docker-compose.yml` with `app` (production-style build served by Nest) and `postgres` (17-alpine, internal network only, healthcheck), plus `.env.example` documenting every variable; verify `docker compose config` is valid and postgres publishes no host port
- [x] 5.2 Verify the P0 exit criterion: from a clean checkout, `cp .env.example .env && docker compose up` brings up the stack and the shell is reachable at the configured port (health endpoint and shell both respond)

## 6. CI

- [x] 6.1 Add `.github/workflows/ci.yml` (push + pull request): Node 26 LTS (setup-node), latest stable majors for all frameworks, `npm ci`, build, lint, typecheck, test (includes catalog parity); verify the workflow passes on the skeleton commit
- [x] 6.2 Verify the gate blocks: open a commit with a failing unit test and observe the workflow fail
- [x] 6.3 Add the Sonar quality pass to CI: `sonar-project.properties` (project key `radixhomework_dm-assistant`, lcov coverage paths), vitest coverage in `app-web` and `packages/schemas`, scan + quality-gate steps in `ci.yml`; verify coverage locally — the scan runs on GitHub once the `GH_SONAR_TOKEN` organization secret applies to the repository

## 7. Wrap-up

- [x] 7.1 Add a short README section (local dev without Docker, `docker compose up` path, `db:migrate` command); verify a new contributor can follow it from a clean clone
- [x] 7.2 Confirm `ROADMAP.md` P0 exit criteria are met and mark the phase done in the change summary

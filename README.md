# DM Assistant

Self-hosted webapp (PWA + MCP server) for Dungeon Masters: one world per
instance, structured lore records, coherence audit — and an assistant that
creates nothing but flags what needs attention. See `PRODUCT.md`,
`ARCHITECTURE.md`, `GOVERNANCE.md` and `AGENTS.md`.

## Development (WSL)

Node 26 LTS via nvm, npm workspaces. Docker + Compose live in WSL.

```bash
# 1. install
. ~/.nvm/nvm.sh && nvm use
npm install

# 2. work without Docker (hot reload)
npm run db:migrate -w app   # needs DATABASE_URL pointing at a reachable postgres
npm run dev -w app-web      # Vite on :5173, proxies /api to :3000
npm run dev                 # ...run the API with nest start --watch in another terminal

# 3. the one-command stack (single door, production-style build)
cp .env.example .env
docker compose up --build
# shell on http://localhost:3000, health at /api/health, MCP at /mcp

# 4. database migrations
docker compose up -d postgres
docker compose run --rm app npm run db:migrate -w app
```

## Quality gate

```bash
npm run build && npm run lint && npm run typecheck && npm run test
```

CI runs the same steps on every push and pull request.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Surface test failures as GitHub Actions annotations: the CI log
    // itself is not readable without a token.
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
    // DB-backed tests share one Postgres: file workers must not race on
    // TRUNCATE-based isolation.
    fileParallelism: false,
    // The TRUNCATE-based isolation and migration hooks occasionally
    // exceed vitest's 5s defaults on cold CI runners — the whole DB
    // suite then cascades into timeouts. Give them headroom instead.
    testTimeout: 20000,
    hookTimeout: 30000,
    exclude: ["**/node_modules/**", "dist/**"],
    // postgres v4 is ESM-only; inline it so the CJS-compiled app can load
    // it through the vitest transform pipeline (runtime uses require(esm)).
    server: {
      deps: {
        inline: ["postgres"],
      },
    },
    coverage: {
      reporter: ["lcov"],
      include: ["src"],
    },
  },
});

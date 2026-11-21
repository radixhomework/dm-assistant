import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Surface test failures as GitHub Actions annotations: the CI log
    // itself is not readable without a token.
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
    exclude: ["**/node_modules/**", "dist/**"],
    coverage: {
      reporter: ["lcov"],
      include: ["src"],
    },
  },
});

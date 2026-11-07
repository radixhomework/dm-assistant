import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["src/testing/setup.ts"],
    exclude: [...configDefaults.exclude, "src/editor/round-trip/adhoc.spec.ts"],
    coverage: {
      reporter: ["lcov"],
      include: ["src"],
      exclude: [
        ...configDefaults.coverage.exclude,
        "src/editor/round-trip/corpus/**",
        "src/editor/round-trip/corpus-local/**",
      ],
    },
  },
});

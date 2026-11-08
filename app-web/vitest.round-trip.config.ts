import { defineConfig } from "vitest/config";

// Config for the ad-hoc round-trip runner only (npm run round-trip). It runs
// src/editor/round-trip/adhoc.spec.ts, which the default config excludes so
// the build gate covers the committed corpus without personal documents.
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["src/testing/setup.ts"],
  },
});

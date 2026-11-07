import { describe, expect, it } from "vitest";
import { envSchema } from "./index.js";

describe("envSchema", () => {
  it("applies documented defaults on an empty environment", () => {
    const env = envSchema.parse({});
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe(
      "postgres://dm:dm@localhost:5432/dm_assistant",
    );
    expect(env.UI_LOCALE).toBe("en");
    expect(env.AUTHORING_LOCALE).toBe("en");
  });

  it("accepts every documented locale", () => {
    const env = envSchema.parse({ UI_LOCALE: "fr", AUTHORING_LOCALE: "fr" });
    expect(env.UI_LOCALE).toBe("fr");
    expect(env.AUTHORING_LOCALE).toBe("fr");
  });

  it("rejects an unknown UI_LOCALE naming the offending variable", () => {
    const result = envSchema.safeParse({ UI_LOCALE: "de" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("UI_LOCALE");
    }
  });

  it("rejects a non-numeric PORT", () => {
    const result = envSchema.safeParse({ PORT: "not-a-number" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("PORT");
    }
  });
});

import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./unique-violation.js";

describe("isUniqueViolation", () => {
  it("detects the postgres code on the error and on its cause", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
  });

  it("detects the message wording, never the object stringification", () => {
    expect(
      isUniqueViolation(
        new Error("duplicate key value violates unique constraint"),
      ),
    ).toBe(true);
    expect(
      isUniqueViolation({ message: "unique constraint failed" }),
    ).toBe(true);
    // A plain object without a message must not depend on the useless
    // "[object Object]" default string format.
    expect(isUniqueViolation({})).toBe(false);
    expect(isUniqueViolation(Object.assign(new Error("boom")))).toBe(false);
    expect(isUniqueViolation("duplicate key")).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

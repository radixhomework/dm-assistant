import { describe, expect, it } from "vitest";

// Temporary probe for tasks.md 6.2 — reverted right after the run.
describe("CI gate probe", () => {
  it("fails on purpose to prove the gate blocks", () => {
    expect(true).toBe(false);
  });
});

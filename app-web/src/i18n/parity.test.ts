import { describe, expect, it } from "vitest";
import en from "./en.json";
import fr from "./fr.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

// Every label must exist in BOTH languages (AGENTS.md §4): a key present
// in one catalog and missing in the other fails the build.
describe("i18n catalog parity", () => {
  it("fr and en expose identical key sets", () => {
    expect(flatten(fr).sort()).toEqual(flatten(en).sort());
  });
});

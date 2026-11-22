import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { proseFieldKeys } from "@dm/schemas";
import { buildSearchVector, extractSearchableText } from "./search-index.js";

describe("extractSearchableText", () => {
  it("joins the prose field values in field order", () => {
    const text = extractSearchableText({
      public_description: "Une école de magie.",
      dm_summary: "Notes du MD.",
      pitch: "Le pitch.",
    });
    expect(text).toBe("Une école de magie.\nNotes du MD.\nLe pitch.");
  });

  it("skips non-text values and empty strings", () => {
    const text = extractSearchableText({
      public_description: "Contenu utile.",
      play_status: "played",
      statistics: { ac: 15 },
      dm_summary: "",
    });
    expect(text).toBe("Contenu utile.");
  });

  it("ignores keys outside the text-field set", () => {
    const text = extractSearchableText({
      some_random_key: "should not appear",
      public_description: "apparaît",
    });
    expect(text).toBe("apparaît");
  });

  it("returns an empty string for null or empty fields", () => {
    expect(extractSearchableText(null)).toBe("");
    expect(extractSearchableText({})).toBe("");
  });
});

describe("buildSearchVector", () => {
  it("produces the weighted tsvector fragment through the fixed configuration", () => {
    const dialect = new PgDialect();
    const { sql: rendered, params } = dialect.sqlToQuery(
      buildSearchVector("École de magie", "Une école réputée."),
    );
    expect(rendered).toBe(
      "setweight(to_tsvector('simple_unaccent', $1), 'A') || " +
        "setweight(to_tsvector('simple_unaccent', $2), 'B')",
    );
    expect(params).toEqual(["École de magie", "Une école réputée."]);
  });
});

/**
 * The migration backfill extracts the same field set as this module: its
 * hardcoded key list must match proseFieldKeys exactly (round-1 task
 * 1.3). A registry change without a migration update fails here.
 */
describe("migration drift guard", () => {
  it("the backfill key list matches proseFieldKeys", () => {
    const migrationSql = readFileSync(
      join(process.cwd(), "drizzle", "0009_search_vector.sql"),
      "utf8",
    );
    const match = /"key" IN \(([^)]+)\)/.exec(migrationSql);
    expect(match, "the backfill statement keeps its key list").not.toBeNull();
    const migrationKeys = match![1]
      .split(",")
      .map((key) => key.trim().replaceAll("'", ""))
      .sort();
    expect(migrationKeys).toEqual([...proseFieldKeys].sort());
  });
});

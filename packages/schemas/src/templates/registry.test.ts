import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { templateSchemas, templateTypes } from "./registry.js";
import { abilityModifier, statisticsSchema } from "./statistics.js";
import { calendarDateSchema, moneySchema, recurrenceSchema } from "./vocabulary.js";

// ---------------------------------------------------------------------------
// Registry coverage — the visible label→key mapping for DM review
// ---------------------------------------------------------------------------

const expectedKeys: Record<string, { fields: string[]; references: string[] }> = {
  "characters-and-entities": {
    fields: ["illustration", "gender", "physical_traits", "statistics", "public_description", "private_description"],
    references: ["origin", "species", "classes", "languages", "characters", "beliefs", "organizations", "knowledge", "works"],
  },
  places: {
    fields: ["illustration", "place_type", "population", "public_description", "private_description"],
    references: ["leaders", "nations", "characters", "events"],
  },
  organizations: {
    fields: ["illustration", "member_count", "public_description", "private_description"],
    references: ["headquarters", "leaders", "characters", "organizations", "events"],
  },
  monsters: {
    fields: ["illustration", "statistics", "traits", "actions", "bonus_actions", "public_description", "private_description"],
    references: ["languages", "treasure_types"],
  },
  nations: {
    fields: ["illustration", "population", "political_system", "public_description", "private_description"],
    references: ["capital", "geography", "beliefs", "works", "knowledge", "languages", "characters", "organizations", "events"],
  },
  "natural-landmarks": {
    fields: ["illustration", "public_description", "private_description"],
    references: ["nations"],
  },
  works: {
    fields: ["illustration", "public_description", "private_description"],
    references: ["origin", "events", "characters", "organizations"],
  },
  events: {
    fields: ["illustration", "start", "end", "recurrence", "public_description", "private_description"],
    references: ["origin", "geography", "characters", "events"],
  },
  "equipment-and-items": {
    fields: ["illustration", "value", "weight", "size", "rarity", "level", "public_description", "private_description"],
    references: [],
  },
  "beliefs-myths-and-customs": {
    fields: ["illustration", "follower_count", "public_description", "private_description"],
    references: ["origin", "events", "characters", "organizations", "beliefs"],
  },
  "knowledge-and-technologies": {
    fields: ["illustration", "public_description", "private_description"],
    references: ["origin", "events", "places", "characters", "knowledge", "nations", "beliefs"],
  },
  "game-rules": {
    fields: ["public_description"],
    references: [],
  },
  campaign: { fields: ["illustration", "pitch", "dm_summary"], references: [] },
  chapter: { fields: ["illustration", "dm_summary", "order"], references: ["campaign"] },
  scene: {
    fields: ["illustration", "dm_summary", "running_notes", "play_status", "order"],
    references: ["chapter"],
  },
  classes: { fields: ["pitch", "public_description", "private_description"], references: [] },
  species: { fields: ["pitch", "public_description", "private_description"], references: [] },
  conditions: { fields: ["pitch", "public_description", "private_description"], references: [] },
  fauna: { fields: ["pitch", "statistics", "public_description", "private_description"], references: [] },
  flora: { fields: ["pitch", "statistics", "public_description", "private_description"], references: [] },
  languages: { fields: ["pitch", "public_description", "private_description"], references: [] },
  "damage-types": { fields: ["pitch", "public_description", "private_description"], references: [] },
  "treasure-types": { fields: ["pitch", "public_description", "private_description"], references: [] },
};

describe("template registry coverage", () => {
  it("covers exactly the 15 templates and 8 catalogs", () => {
    expect(templateTypes).toHaveLength(23);
    expect(templateTypes.sort()).toEqual(Object.keys(expectedKeys).sort());
  });

  it("declares exactly the reviewed field keys for each template", () => {
    for (const [type, expected] of Object.entries(expectedKeys)) {
      const schema = templateSchemas[type as keyof typeof templateSchemas];
      const shape = (schema.fields as unknown as { shape: Record<string, unknown> }).shape;
      expect(Object.keys(shape).sort(), `${type} fields`).toEqual([...expected.fields].sort());
      expect(Object.keys(schema.references).sort(), `${type} references`).toEqual([...expected.references].sort());
    }
  });

  it("maps every template file to a registry entry", () => {
    const templatesDir = join(__dirname, "../../../../templates");
    const files: string[] = [];
    for (const dir of ["world", "campaign", "catalogs"]) {
      const base = join(templatesDir, dir);
      if (!existsSync(base)) continue;
      for (const entry of readdirSync(base, { recursive: true })) {
        const name = String(entry);
        if (name.endsWith(".md")) files.push(name.replace(/\.md$/, "").split(/[\\/]/).pop()!);
      }
    }
    expect(files).toHaveLength(23);
    for (const name of files) {
      expect(templateSchemas[name as keyof typeof templateSchemas], `${name} registered`).toBeDefined();
    }
  });

  it("declares single targets for 0..1 reference fields", () => {
    expect(templateSchemas.places.references.leaders).toEqual({
      target: "characters-and-entities",
      cardinality: "many",
    });
    expect(templateSchemas.chapter.references.campaign).toEqual({
      target: "campaign",
      cardinality: "one",
    });
    expect(templateSchemas.scene.references.chapter).toEqual({
      target: "chapter",
      cardinality: "one",
    });
  });
});

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

describe("field-type vocabulary", () => {
  it("validates money with its currency", () => {
    expect(moneySchema.safeParse({ amount: 12.5, currency: "gp" }).success).toBe(true);
    expect(moneySchema.safeParse({ amount: 3, currency: "gold" }).success).toBe(false);
    expect(moneySchema.safeParse({ amount: "3", currency: "gp" }).success).toBe(false);
  });

  it("accepts partial calendar dates in the right granularity", () => {
    expect(calendarDateSchema.safeParse({ year: 842 }).success).toBe(true);
    expect(calendarDateSchema.safeParse({ era: "Age of Wolves", year: -120 }).success).toBe(true);
    expect(calendarDateSchema.safeParse({ year: 842, month: 3 }).success).toBe(true);
    expect(calendarDateSchema.safeParse({ year: 842, month: 3, day: 12 }).success).toBe(true);
  });

  it("rejects year 0 and broken granularity", () => {
    expect(calendarDateSchema.safeParse({ year: 0 }).success).toBe(false);
    expect(calendarDateSchema.safeParse({ month: 3 }).success).toBe(false);
    expect(calendarDateSchema.safeParse({ year: 842, day: 12 }).success).toBe(false);
  });

  it("validates recurrence units and positive intervals", () => {
    expect(recurrenceSchema.safeParse({ unit: "week", interval: 2 }).success).toBe(true);
    expect(recurrenceSchema.safeParse({ unit: "day", interval: 1 }).success).toBe(false);
    expect(recurrenceSchema.safeParse({ unit: "month", interval: 0 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Statistics block
// ---------------------------------------------------------------------------

describe("abilityModifier", () => {
  it("follows the SRD rule floor((score - 10) / 2)", () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(20)).toBe(5);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(27)).toBe(8);
  });
});

describe("statisticsSchema", () => {
  const base = {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
    savingThrows: { strength: { raw: 16, modifier: 3 } },
    ac: 17,
    hp: { average: 66, formula: "12d8+12" },
    speed: { walk: 9, fly: 18 },
    initiative: 2,
    size: "large",
    darkvision: 18,
    passivePerception: 13,
    vulnerabilities: ["fire"],
    resistances: ["cold"],
    immunities: ["poison"],
  };

  it("accepts a full block", () => {
    expect(statisticsSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an empty block and defaults the damage lists", () => {
    const parsed = statisticsSchema.parse({});
    expect(parsed.vulnerabilities).toEqual([]);
    expect(parsed.resistances).toEqual([]);
    expect(parsed.immunities).toEqual([]);
  });

  it("keeps damage-type entries as slug strings", () => {
    expect(statisticsSchema.safeParse({ ...base, vulnerabilities: [42] }).success).toBe(false);
  });

  it("rejects an unknown size", () => {
    expect(statisticsSchema.safeParse({ ...base, size: "colossal" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Template strictness
// ---------------------------------------------------------------------------

describe("template strictness", () => {
  it("rejects fields the template does not know", () => {
    const parsed = templateSchemas.places.fields.safeParse({ population: "2M", nickname: "The Pearl" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a statistics block on a catalog without statistics", () => {
    expect(templateSchemas.classes.fields.safeParse({ statistics: { ac: 10 } }).success).toBe(false);
  });

  it("accepts a statistics block on fauna", () => {
    expect(templateSchemas.fauna.fields.safeParse({ statistics: { ac: 12 } }).success).toBe(true);
  });

  it("accepts an empty fields object (no required field)", () => {
    expect(templateSchemas["characters-and-entities"].fields.safeParse({}).success).toBe(true);
  });
});

import { z } from "zod";
import { playStatuses } from "./entities.js";

/**
 * The executable data model of the world's records (PRE-SPEC.md §5).
 * Source of truth: the `templates/` folder — field keys below are the
 * snake_case form of the templates' English labels, verbatim (they are
 * data, outside the i18n catalogs). Reference fields are declared here
 * for rendering but stored in the `relationships` table (kind = field
 * key), never inside `fields` JSONB.
 */

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

export const currencies = ["gp", "sp", "cp"] as const;
export const moneySchema = z.object({
  amount: z.number(),
  currency: z.enum(currencies),
});
export type Money = z.infer<typeof moneySchema>;

/** Era is free short text ("Age of Wolves"); years are signed, no year 0. */
export const calendarDateSchema = z
  .object({
    era: z.string().min(1).max(80).optional(),
    year: z.number().int(),
    month: z.number().int().positive().optional(),
    day: z.number().int().positive().optional(),
  })
  .refine((date) => date.year !== 0, { message: "year 0 does not exist" })
  .refine((date) => date.month === undefined || date.year !== undefined, {
    message: "a month requires a year",
  })
  .refine((date) => date.day === undefined || date.month !== undefined, {
    message: "a day requires a month",
  });
export type CalendarDate = z.infer<typeof calendarDateSchema>;

export const recurrenceSchema = z.object({
  unit: z.enum(["week", "month", "year"]),
  interval: z.number().int().positive(),
});
export type Recurrence = z.infer<typeof recurrenceSchema>;

/** Free numeric string: numbers the DM enters as text (populations, weights). */
export const numericStringSchema = z.string().min(1).max(60);

/** Asset reference placeholder — replaced by the S3 gateway in P4. */
export const assetReferenceSchema = z.string().max(400);

export const orderSchema = z.number().int().nonnegative();

export const referenceCardinalities = ["one", "many"] as const;
export type ReferenceCardinality = (typeof referenceCardinalities)[number];

export type ReferenceDeclaration = {
  target: string;
  cardinality: ReferenceCardinality;
};

// ---------------------------------------------------------------------------
// Statistics block (embedded by Characters and entities, Monsters, Fauna,
// Flora — full definition in templates/_index.md)
// ---------------------------------------------------------------------------

export const abilities = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;
export type Ability = (typeof abilities)[number];

/** SRD rule: modifier = floor((score - 10) / 2). Pure, display-only. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export const sizeValues = [
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan",
] as const;
export const rarityValues = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "epic",
  "legendary",
  "unique",
] as const;

/**
 * Alignment and creature type are SRD value lists delivered by the P3
 * import — free short strings until then (charter rule 6: never invented).
 */
export const savingThrowSchema = z.object({
  raw: z.number().int(),
  modifier: z.number().int(),
});
export const statisticsSchema = z.object({
  strength: z.number().int().optional(),
  dexterity: z.number().int().optional(),
  constitution: z.number().int().optional(),
  intelligence: z.number().int().optional(),
  wisdom: z.number().int().optional(),
  charisma: z.number().int().optional(),
  savingThrows: z
    .object({
      strength: savingThrowSchema.optional(),
      dexterity: savingThrowSchema.optional(),
      constitution: savingThrowSchema.optional(),
      intelligence: savingThrowSchema.optional(),
      wisdom: savingThrowSchema.optional(),
      charisma: savingThrowSchema.optional(),
    })
    .optional(),
  ac: z.number().int().optional(),
  hp: z.object({ average: z.number().int(), formula: z.string() }).optional(),
  speed: z
    .object({
      walk: z.number().optional(),
      fly: z.number().optional(),
      swim: z.number().optional(),
      burrow: z.number().optional(),
      climb: z.number().optional(),
    })
    .optional(),
  initiative: z.number().int().optional(),
  alignment: z.string().max(80).optional(),
  creatureType: z.string().max(80).optional(),
  size: z.enum(sizeValues).optional(),
  darkvision: z.number().optional(),
  passivePerception: z.number().int().optional(),
  vulnerabilities: z.array(z.string()).default([]),
  resistances: z.array(z.string()).default([]),
  immunities: z.array(z.string()).default([]),
});
export type Statistics = z.infer<typeof statisticsSchema>;

// ---------------------------------------------------------------------------
// Field keys — snake_case form of the templates' labels (review table).
// ---------------------------------------------------------------------------

/** Catalog body: Pitch, [Statistics], Public description, Private description. */
function catalogSchema(withStatistics: boolean): TemplateSchema {
  const fields: Record<string, z.ZodType> = {
    pitch: z.string().optional(),
    public_description: z.string().optional(),
    private_description: z.string().optional(),
  };
  if (withStatistics) {
    fields.statistics = statisticsSchema.optional();
  }
  return template(fields);
}

const proseField = z.string().optional();
const assetField = assetReferenceSchema.optional();

// ---------------------------------------------------------------------------
// Template registry — 15 templates + 8 catalogs
// ---------------------------------------------------------------------------

export type TemplateSchema = {
  /** Field validation: applies to the `fields` JSONB (references excluded). */
  fields: z.ZodType;
  /** Reference fields: rendered from the relationships table, key → target. */
  references: Record<string, ReferenceDeclaration>;
};

function template(
  fields: Record<string, z.ZodType>,
  references: Record<string, ReferenceDeclaration> = {},
): TemplateSchema {
  return { fields: z.object(fields).strict(), references };
}

const refOne = (target: string): ReferenceDeclaration => ({ target, cardinality: "one" });
const refMany = (target: string): ReferenceDeclaration => ({ target, cardinality: "many" });

export const templateSchemas = {
  // ---- World perimeter -----------------------------------------------------
  "characters-and-entities": template(
    {
      illustration: assetField,
      gender: z.enum(["male", "female", "nonbinary"]).optional(),
      physical_traits: proseField,
      statistics: statisticsSchema.optional(),
      public_description: proseField,
      private_description: proseField,
    },
    {
      origin: refOne("places"),
      species: refMany("species"),
      classes: refMany("classes"),
      languages: refMany("languages"),
      characters: refMany("characters-and-entities"),
      beliefs: refMany("beliefs-myths-and-customs"),
      organizations: refMany("organizations"),
      knowledge: refMany("knowledge-and-technologies"),
      works: refMany("works"),
    },
  ),
  places: template(
    {
      illustration: assetField,
      place_type: z.enum(["intangible_place", "locality", "city"]).optional(),
      population: numericStringSchema.optional(),
      public_description: proseField,
      private_description: proseField,
    },
    {
      leaders: refMany("characters-and-entities"),
      nations: refMany("nations"),
      characters: refMany("characters-and-entities"),
      events: refMany("events"),
    },
  ),
  organizations: template(
    {
      illustration: assetField,
      member_count: numericStringSchema.optional(),
      public_description: proseField,
      private_description: proseField,
    },
    {
      headquarters: refOne("places"),
      leaders: refMany("characters-and-entities"),
      characters: refMany("characters-and-entities"),
      organizations: refMany("organizations"),
      events: refMany("events"),
    },
  ),
  monsters: template(
    {
      illustration: assetField,
      statistics: statisticsSchema.optional(),
      traits: proseField,
      actions: proseField,
      bonus_actions: proseField,
      public_description: proseField,
      private_description: proseField,
    },
    {
      languages: refMany("languages"),
      treasure_types: refMany("treasure-types"),
    },
  ),
  nations: template(
    {
      illustration: assetField,
      population: numericStringSchema.optional(),
      political_system: z
        .enum([
          "anarchy",
          "aristocracy",
          "autocracy",
          "confederation",
          "diarchy",
          "empire",
          "matriarchy",
          "militocracy",
          "monarchy",
          "oligarchy",
          "patriarchy",
          "republic",
          "tribal_system",
          "theocracy",
          "timocracy",
          "triarchy",
        ])
        .optional(),
      public_description: proseField,
      private_description: proseField,
    },
    {
      capital: refOne("places"),
      geography: refMany("places"),
      beliefs: refMany("beliefs-myths-and-customs"),
      works: refMany("works"),
      knowledge: refMany("knowledge-and-technologies"),
      languages: refMany("languages"),
      characters: refMany("characters-and-entities"),
      organizations: refMany("organizations"),
      events: refMany("events"),
    },
  ),
  "natural-landmarks": template(
    {
      illustration: assetField,
      public_description: proseField,
      private_description: proseField,
    },
    {
      nations: refMany("nations"),
    },
  ),
  works: template(
    {
      illustration: assetField,
      public_description: proseField,
      private_description: proseField,
    },
    {
      origin: refOne("places"),
      events: refMany("events"),
      characters: refMany("characters-and-entities"),
      organizations: refMany("organizations"),
    },
  ),
  events: template(
    {
      illustration: assetField,
      start: calendarDateSchema.optional(),
      end: calendarDateSchema.optional(),
      recurrence: recurrenceSchema.optional(),
      public_description: proseField,
      private_description: proseField,
    },
    {
      origin: refOne("places"),
      geography: refMany("places"),
      characters: refMany("characters-and-entities"),
      events: refMany("events"),
    },
  ),
  "equipment-and-items": template(
    {
      illustration: assetField,
      value: moneySchema.optional(),
      weight: numericStringSchema.optional(),
      size: z.enum(sizeValues).optional(),
      rarity: z.enum(rarityValues).optional(),
      level: numericStringSchema.optional(),
      public_description: proseField,
      private_description: proseField,
    },
  ),
  "beliefs-myths-and-customs": template(
    {
      illustration: assetField,
      follower_count: numericStringSchema.optional(),
      public_description: proseField,
      private_description: proseField,
    },
    {
      origin: refOne("places"),
      events: refMany("events"),
      characters: refMany("characters-and-entities"),
      organizations: refMany("organizations"),
      beliefs: refMany("beliefs-myths-and-customs"),
    },
  ),
  "knowledge-and-technologies": template(
    {
      illustration: assetField,
      public_description: proseField,
      private_description: proseField,
    },
    {
      origin: refOne("places"),
      events: refMany("events"),
      places: refMany("places"),
      characters: refMany("characters-and-entities"),
      knowledge: refMany("knowledge-and-technologies"),
      nations: refMany("nations"),
      beliefs: refMany("beliefs-myths-and-customs"),
    },
  ),
  "game-rules": template(
    {
      public_description: proseField,
    },
  ),

  // ---- Campaign perimeter --------------------------------------------------
  campaign: template(
    {
      illustration: assetField,
      pitch: proseField,
      dm_summary: proseField,
    },
  ),
  chapter: template(
    {
      illustration: assetField,
      dm_summary: proseField,
      order: orderSchema.optional(),
    },
    {
      campaign: refOne("campaign"),
    },
  ),
  scene: template(
    {
      illustration: assetField,
      dm_summary: proseField,
      running_notes: proseField,
      play_status: z.enum(playStatuses).optional(),
      order: orderSchema.optional(),
    },
    {
      chapter: refOne("chapter"),
    },
  ),

  // ---- Catalogs ------------------------------------------------------------
  classes: catalogSchema(false),
  species: catalogSchema(false),
  conditions: catalogSchema(false),
  fauna: catalogSchema(true),
  flora: catalogSchema(true),
  languages: catalogSchema(false),
  "damage-types": catalogSchema(false),
  "treasure-types": catalogSchema(false),
} satisfies Record<string, TemplateSchema>;

export type TemplateType = keyof typeof templateSchemas;
export const templateTypes = Object.keys(templateSchemas) as TemplateType[];

export function templateSchemaOf(type: string): TemplateSchema | undefined {
  return templateSchemas[type as TemplateType];
}

/**
 * The reusable Statistics block embedded by the Characters and entities,
 * Monsters, Fauna and Flora templates (full definition in
 * templates/_index.md). Mechanical values are never invented by the
 * application — they come from the DM's input or the SRD import only.
 */

import { z } from "zod";

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
const savingThrowSchema = z.object({
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

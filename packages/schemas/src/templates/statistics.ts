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
/** SRD alignments: the law/chaos × good/evil grid plus unaligned
 * (SRD 5.2 FR : « Loyal Bon » … « Chaotique Mauvais », « non alignée »). */
export const alignmentValues = [
  "lawful_good",
  "neutral_good",
  "chaotic_good",
  "lawful_neutral",
  "neutral",
  "chaotic_neutral",
  "lawful_evil",
  "neutral_evil",
  "chaotic_evil",
  "unaligned",
] as const;
/** SRD creature types. */
export const creatureTypeValues = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
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
/** Une case de maîtrise par caractéristique (JdC ou JdS). */
const abilityFlagsSchema = z.object({
  strength: z.boolean().optional(),
  dexterity: z.boolean().optional(),
  constitution: z.boolean().optional(),
  intelligence: z.boolean().optional(),
  wisdom: z.boolean().optional(),
  charisma: z.boolean().optional(),
});

export const statisticsSchema = z.object({
  strength: z.number().int().optional(),
  dexterity: z.number().int().optional(),
  constitution: z.number().int().optional(),
  intelligence: z.number().int().optional(),
  wisdom: z.number().int().optional(),
  charisma: z.number().int().optional(),
  /** Bonus de maîtrise : ajouté automatiquement aux JdC et JdS
   * maîtrisés (valeur saisie par le MJ ou fournie par l'import SRD). */
  proficiencyBonus: z.number().int().optional(),
  /** JdC maîtrisés (une case par caractéristique). */
  checksMastery: abilityFlagsSchema.optional(),
  /** JdS maîtrisés (une case par caractéristique). */
  savesMastery: abilityFlagsSchema.optional(),
  /** Compétences maîtrisées : le modificateur est stocké — il préremplit
   * (caractéristique associée + bonus de maîtrise) mais reste éditable,
   * des éléments hors fiche pouvant l'ajuster. */
  skills: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        ability: z.enum(abilities),
        modifier: z.number().int().optional(),
      }),
    )
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
  alignment: z.enum(alignmentValues).optional(),
  creatureType: z.enum(creatureTypeValues).optional(),
  size: z.enum(sizeValues).optional(),
  /** Les cinq sens du bloc de stats SRD (la Perception passive est
   * stockée à part). */
  senses: z
    .object({
      tremorsense: z.number().optional(),
      blindsight: z.number().optional(),
      darkvision: z.number().optional(),
      truesight: z.number().optional(),
    })
    .optional(),
  passivePerception: z.number().int().optional(),
  /** Équipement porté ou détenu, tel qu'imprimé dans les blocs de stats
   * SRD (texte libre). */
  equipment: z.string().max(400).optional(),
  vulnerabilities: z.array(z.string()).default([]),
  resistances: z.array(z.string()).default([]),
  immunities: z.array(z.string()).default([]),
});
export type Statistics = z.infer<typeof statisticsSchema>;

/**
 * Template registry: assembles the 23 per-template schemas (15 templates +
 * 8 catalogs) into the lookup the API validation and the form renderer use.
 */

import { beliefsMythsAndCustoms } from "./world/beliefs-myths-and-customs.js";
import { charactersAndEntities } from "./world/characters-and-entities.js";
import { equipmentAndItems } from "./world/equipment-and-items.js";
import { events } from "./world/events.js";
import { gameRules } from "./world/game-rules.js";
import { knowledgeAndTechnologies } from "./world/knowledge-and-technologies.js";
import { monsters } from "./world/monsters.js";
import { nations } from "./world/nations.js";
import { naturalLandmarks } from "./world/natural-landmarks.js";
import { organizations } from "./world/organizations.js";
import { places } from "./world/places.js";
import { works } from "./world/works.js";
import { campaign } from "./campaign/campaign.js";
import { chapter } from "./campaign/chapter.js";
import { scene } from "./campaign/scene.js";
import { classes } from "./catalogs/classes.js";
import { conditions } from "./catalogs/conditions.js";
import { damageTypes } from "./catalogs/damage-types.js";
import { fauna } from "./catalogs/fauna.js";
import { flora } from "./catalogs/flora.js";
import { languages } from "./catalogs/languages.js";
import { species } from "./catalogs/species.js";
import { treasureTypes } from "./catalogs/treasure-types.js";
import type { TemplateSchema } from "./factory.js";

/** The 23 template/catalog schemas, keyed by record type. */
export const templateSchemas = {
  // World perimeter
  "characters-and-entities": charactersAndEntities,
  places,
  organizations,
  monsters,
  nations,
  "natural-landmarks": naturalLandmarks,
  works,
  events,
  "equipment-and-items": equipmentAndItems,
  "beliefs-myths-and-customs": beliefsMythsAndCustoms,
  "knowledge-and-technologies": knowledgeAndTechnologies,
  "game-rules": gameRules,
  // Campaign perimeter
  campaign,
  chapter,
  scene,
  // Catalogs
  classes,
  species,
  conditions,
  fauna,
  flora,
  languages,
  "damage-types": damageTypes,
  "treasure-types": treasureTypes,
} satisfies Record<string, TemplateSchema>;

export type TemplateType = keyof typeof templateSchemas;
export const templateTypes = Object.keys(templateSchemas) as TemplateType[];

/**
 * Looks up the schema of a record type. Returns undefined for unregistered
 * types — those keep the P1 structural fields validation.
 */
export function templateSchemaOf(type: string): TemplateSchema | undefined {
  return templateSchemas[type as TemplateType];
}

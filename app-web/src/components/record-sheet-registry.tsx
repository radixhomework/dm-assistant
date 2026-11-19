import type { ComponentType } from "react";
import { CharacterSheet } from "./character-sheet.js";
import { PlaceSheet } from "./place-sheet.js";
import { OrganizationSheet } from "./organization-sheet.js";
import { MonsterSheet } from "./monster-sheet.js";
import { NationSheet } from "./nation-sheet.js";
import { NaturalLandmarkSheet } from "./natural-landmark-sheet.js";
import { WorkSheet } from "./work-sheet.js";
import { EventSheet } from "./event-sheet.js";
import { EquipmentSheet } from "./equipment-sheet.js";
import { BeliefSheet } from "./belief-sheet.js";
import { KnowledgeSheet } from "./knowledge-sheet.js";
import { GameRuleSheet } from "./game-rule-sheet.js";
import type { Entity } from "../types.js";

/**
 * The bespoke reading sheet per record type (records-editor 9.x). Types
 * without an entry fall back to the generic scaffold rows. A new sheet
 * registers here instead of growing a conditional chain in the page.
 */
const registry: Record<string, ComponentType<{ readonly record: Entity }>> = {
  "characters-and-entities": CharacterSheet,
  places: PlaceSheet,
  organizations: OrganizationSheet,
  monsters: MonsterSheet,
  nations: NationSheet,
  "natural-landmarks": NaturalLandmarkSheet,
  works: WorkSheet,
  events: EventSheet,
  "equipment-and-items": EquipmentSheet,
  "beliefs-myths-and-customs": BeliefSheet,
  "knowledge-and-technologies": KnowledgeSheet,
  "game-rules": GameRuleSheet,
};

/** The bespoke sheet component for a record type, null when the generic
 * scaffold rows apply. */
export function bespokeSheetFor(
  type: string,
): ComponentType<{ readonly record: Entity }> | null {
  return registry[type] ?? null;
}

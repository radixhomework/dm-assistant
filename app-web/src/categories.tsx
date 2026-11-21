import {
  CalendarDays,
  Coins,
  Landmark,
  Languages,
  Lightbulb,
  MapPin,
  Mountain,
  PawPrint,
  Scale,
  ScrollText,
  Skull,
  Sparkles,
  Sword,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CatalogTemplate } from "./types.js";
import type { WorldTemplate } from "./types.js";

/** Icon per world-template category — shared by the Lore page and the
 * sidebar so labels and icons never drift apart. */
export const categoryIcons: Record<WorldTemplate, LucideIcon> = {
  "characters-and-entities": Users,
  places: MapPin,
  organizations: Landmark,
  monsters: Skull,
  nations: Landmark,
  "natural-landmarks": Mountain,
  works: ScrollText,
  events: CalendarDays,
  "equipment-and-items": Sword,
  "beliefs-myths-and-customs": Sparkles,
  "knowledge-and-technologies": Lightbulb,
  "game-rules": Scale,
};

/** Icon per catalog category — same contract as the world templates. */
export const catalogIcons: Record<CatalogTemplate, LucideIcon> = {
  classes: Swords,
  species: PawPrint,
  conditions: Sparkles,
  "damage-types": Sword,
  "treasure-types": Coins,
  languages: Languages,
  fauna: PawPrint,
  flora: Mountain,
};

/** The i18n key of a category label (`lore.categories.<type>`). */
export function categoryLabelKey(type: string): string {
  return `lore.categories.${type}`;
}

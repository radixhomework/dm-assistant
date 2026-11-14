import {
  CalendarDays,
  Landmark,
  Lightbulb,
  MapPin,
  Mountain,
  Scale,
  ScrollText,
  Skull,
  Sparkles,
  Sword,
  Users,
  type LucideIcon,
} from "lucide-react";
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

/** The i18n key of a category label (`lore.categories.<type>`). */
export function categoryLabelKey(type: string): string {
  return `lore.categories.${type}`;
}

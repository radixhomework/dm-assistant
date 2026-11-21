/**
 * Dice formulas: SRD-style notation ("3d6 + 2", "2d8", "1d20 - 1") and
 * the round-down average the stat blocks print — e.g. 3d6+2 → 12 (the
 * per-die average is floored, then the modifier added). Pure math on the
 * DM's formula; the application never invents one.
 */

const DICE_FORMULA = /^([+-]?\d{1,3})?d(\d{1,3})([+-]\d{1,3})?$/;

/** Parses "3d6+2" into (count 3, faces 6, modifier +2). A bare "d20"
 * means one die. Returns null when the formula does not parse. */
export function parseDice(formula: string): {
  count: number;
  faces: number;
  modifier: number;
} | null {
  const match = DICE_FORMULA.exec(formula.replaceAll(" ", ""));
  if (!match) return null;
  const count = match[1] === undefined || match[1] === "" ? 1 : Math.abs(Number(match[1]));
  const faces = Number(match[2]);
  const modifier = match[3] === undefined ? 0 : Number(match[3]);
  if (count < 1 || faces < 1) return null;
  return { count, faces, modifier };
}

/** The average: ((1 + faces) / 2 × dice count) + fixed value, rounded
 * down ("4d8" → 18; "3d6+12" → 22). */
export function diceAverage(formula: string): number | null {
  const parsed = parseDice(formula);
  if (!parsed) return null;
  return (
    Math.floor((parsed.count * (parsed.faces + 1)) / 2) + parsed.modifier
  );
}

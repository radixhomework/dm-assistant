/**
 * SRD imperial → world-unit conversion, applied once at import
 * (srd-catalog-import decision 8): values are stored in the world's
 * configured units — changing the unit later never recalculates
 * anything (PRE-SPEC §2). Exact barème arithmetic, no rounding
 * heuristics: 5 ft = 1.5 m · 1 mile = 1.5 km · 1 lb = 500 g ·
 * 1 gal = 4 l. Identity when the world already uses imperial.
 */

export type WorldUnits = {
  distanceUnit: "m" | "ft";
  weightUnit: "kg" | "lb";
  volumeUnit: "L" | "gal";
};

/** Barème factor: 5 ft = 1.5 m — computed as ×1.5 ÷5 so fractional
 * results stay exact (30 ft → 9 m, not 9.000000000000002). */
const KM_PER_MILE = 1.5;
const KG_PER_LB = 0.5;
const L_PER_GAL = 4;

/** One SRD length given in feet, into the world's distance unit. */
export function convertSrdFeet(feet: number, distanceUnit: "m" | "ft"): number {
  return distanceUnit === "ft" ? feet : (feet * 1.5) / 5;
}

/** One SRD length given in miles, into the world's distance unit
 * (1 mile = 1.5 km = 1500 m). */
export function convertSrdMiles(miles: number, distanceUnit: "m" | "ft"): number {
  return distanceUnit === "ft" ? miles : miles * KM_PER_MILE * 1000;
}

/** One SRD weight given in pounds, into the world's weight unit
 * (1 lb = 500 g = 0.5 kg). */
export function convertSrdPounds(pounds: number, weightUnit: "kg" | "lb"): number {
  return weightUnit === "lb" ? pounds : pounds * KG_PER_LB;
}

/** One SRD volume given in gallons, into the world's volume unit
 * (1 gal = 4 l). */
export function convertSrdGallons(gallons: number, volumeUnit: "L" | "gal"): number {
  return volumeUnit === "gal" ? gallons : gallons * L_PER_GAL;
}

/** The dimensional values the mapped fields may carry: the Statistics
 * block's speed and senses (SRD feet). The conversion walks them into
 * the world's units at import; everything else passes through untouched
 * — prose is never rewritten (charter rule 1). */
export function convertSrdUnits(
  fields: Record<string, unknown>,
  units: WorldUnits,
): Record<string, unknown> {
  const statistics = fields["statistics"];
  if (typeof statistics !== "object" || statistics === null) {
    return fields;
  }
  const stats = { ...(statistics as Record<string, unknown>) };
  const distanceKeys = ["walk", "fly", "swim", "burrow", "climb"];
  const speed = stats["speed"];
  if (typeof speed === "object" && speed !== null) {
    const converted: Record<string, unknown> = { ...(speed as Record<string, unknown>) };
    for (const key of distanceKeys) {
      const value = converted[key];
      if (typeof value === "number") converted[key] = convertSrdFeet(value, units.distanceUnit);
    }
    stats["speed"] = converted;
  }
  const senses = stats["senses"];
  if (typeof senses === "object" && senses !== null) {
    const converted: Record<string, unknown> = { ...(senses as Record<string, unknown>) };
    for (const key of ["tremorsense", "blindsight", "darkvision", "truesight"]) {
      const value = converted[key];
      if (typeof value === "number") converted[key] = convertSrdFeet(value, units.distanceUnit);
    }
    stats["senses"] = converted;
  }
  return { ...fields, statistics: stats };
}

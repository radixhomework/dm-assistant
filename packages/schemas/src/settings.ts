import { z } from "zod";
import { locales } from "./env.js";

/** Closed unit lists (PRE-SPEC.md §2): the admin panel edits these via selects. */
export const distanceUnits = ["m", "ft"] as const;
export const weightUnits = ["kg", "lb"] as const;
export const volumeUnits = ["L", "gal"] as const;

export const updateSettingsSchema = z
  .object({
    contentLanguage: z.enum(locales),
    distanceUnit: z.enum(distanceUnits),
    weightUnit: z.enum(weightUnits),
    volumeUnit: z.enum(volumeUnits),
  })
  .partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

import { z } from "zod";
import { locales } from "./env.js";

export const updateSettingsSchema = z
  .object({
    contentLanguage: z.enum(locales),
    distanceUnit: z.string().min(1).max(20),
    weightUnit: z.string().min(1).max(20),
  })
  .partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

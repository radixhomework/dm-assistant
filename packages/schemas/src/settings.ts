import { z } from "zod";

/** Closed unit lists (PRE-SPEC.md §2): the admin panel edits these via selects. */
export const distanceUnits = ["m", "ft"] as const;
export const weightUnits = ["kg", "lb"] as const;
export const volumeUnits = ["L", "gal"] as const;

export const updateSettingsSchema = z
  .object({
      distanceUnit: z.enum(distanceUnits),
    weightUnit: z.enum(weightUnits),
    volumeUnit: z.enum(volumeUnits),
  })
  .partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * World calendar definition (records-editor decision 7), stored as the
 * `settings.calendar` JSONB: custom months with their lengths, the week
 * length and weekday names, and a moon cycle. The date picker, the year
 * overview and the date node all derive from it.
 */
export const calendarSettingsSchema = z
  .object({
    months: z
      .array(
        z.object({
          name: z.string().min(1).max(40),
          days: z.number().int().min(1).max(400),
        }),
      )
      .min(1)
      .max(36),
    week: z.object({ days: z.number().int().min(1).max(30) }),
    dayNames: z.array(z.string().min(1).max(40)).min(1).max(30),
    moon: z.object({
      name: z.string().min(1).max(80),
      cycleDays: z.number().int().min(1).max(1000),
    }),
  })
  .refine((calendar) => calendar.dayNames.length === calendar.week.days, {
    message: "day names must fill the week",
  });
export type CalendarSettings = z.infer<typeof calendarSettingsSchema>;

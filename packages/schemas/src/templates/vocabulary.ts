/**
 * Shared field-type vocabulary used by the per-template schemas
 * (PRE-SPEC.md §5): currency-aware money, world-calendar dates, recurrence,
 * free numeric strings, asset references and play order.
 */

import { z } from "zod";

/**
 * Shared field-type vocabulary (PRE-SPEC.md §5). Field keys are the
 * snake_case form of the templates' English labels, verbatim (they are
 * data, outside the i18n catalogs).
 */

export const currencies = ["gp", "sp", "cp"] as const;
export const moneySchema = z.object({
  amount: z.number(),
  currency: z.enum(currencies),
});
export type Money = z.infer<typeof moneySchema>;

/** Era is free short text ("Age of Wolves"); years are signed, no year 0. */
export const calendarDateSchema = z
  .object({
    era: z.string().min(1).max(80).optional(),
    year: z.number().int(),
    month: z.number().int().positive().optional(),
    day: z.number().int().positive().optional(),
  })
  .refine((date) => date.year !== 0, { message: "year 0 does not exist" })
  .refine((date) => date.month === undefined || date.year !== undefined, {
    message: "a month requires a year",
  })
  .refine((date) => date.day === undefined || date.month !== undefined, {
    message: "a day requires a month",
  });
export type CalendarDate = z.infer<typeof calendarDateSchema>;

export const recurrenceSchema = z.object({
  unit: z.enum(["week", "month", "year"]),
  interval: z.number().int().positive(),
});
export type Recurrence = z.infer<typeof recurrenceSchema>;

/** Free numeric string: numbers the DM enters as text (populations, weights). */
export const numericStringSchema = z.string().min(1).max(60);

/** Asset reference placeholder — replaced by the S3 gateway in P4. */
export const assetReferenceSchema = z.string().max(400);

export const orderSchema = z.number().int().nonnegative();

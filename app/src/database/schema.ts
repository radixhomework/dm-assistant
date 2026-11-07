import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Instance-scoped settings (PRE-SPEC.md §2): ui_locale, registration_open,
 * content_language, distance_unit, weight_unit, calendar.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

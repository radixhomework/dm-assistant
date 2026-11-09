import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Instance-scoped settings (PRE-SPEC.md §2): ui_locale, content_language,
 * distance_unit, weight_unit, world_name, calendar.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "dm"] })
    .notNull()
    .default("dm"),
  status: text("status", { enum: ["active", "blocked"] })
    .notNull()
    .default("active"),
  /** Per-account UI language (null = instance default from UI_LOCALE). */
  uiLocale: text("ui_locale", { enum: ["en", "fr"] }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().default({}),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const entities = pgTable("entities", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(),
  perimeter: text("perimeter", { enum: ["world", "campaign"] }).notNull(),
  title: text("title").notNull(),
  tags: text("tags")
    .array()
    .notNull()
    .default([]),
  fields: jsonb("fields").notNull().default({}),
  body: text("body").notNull().default(""),
  /** Authoring reference — carries the user-deletion campaign constraint. */
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Typed relationships. Hierarchy kinds (`chapter`, `scene`) carry the
 * child→parent link and are unique per child (partial unique index).
 */
export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromId: uuid("from_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
  },
  (t) => [
    uniqueIndex("relationships_child_role_uq")
      .on(t.fromId, t.kind)
      .where(sql`kind in ('chapter', 'scene')`),
    index("relationships_to_idx").on(t.toId, t.kind),
  ],
);

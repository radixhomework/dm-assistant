import { sql } from "drizzle-orm";
import {
  customType,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Postgres tsvector (full-text search): driver round-trips the raw
 * vector text, the application never manipulates it beyond SQL. */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

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
  /** Login name — unique, lowercase; the email stays a profile field. */
  username: text("username").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [uniqueIndex("users_username_uq").on(t.username)]);

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
  /** Authoring reference — carries the user-deletion campaign constraint. */
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  /**
   * Full-text search vector (full-text-search capability): maintained by
   * the application service on every write — title weighted A, the
   * template-declared text field values weighted B — through the ONE
   * fixed `simple_unaccent` configuration (PRE-SPEC §2, decision of
   * 2026-11-09). No DB trigger: the indexed field set is template-driven.
   */
  searchVector: tsvector("search_vector"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [index("entities_search_vector_idx").using("gin", t.searchVector)]);

/**
 * Typed relationships. Hierarchy kinds (`campaign`, `chapter`) carry the
 * child→parent link and are unique per child (partial unique index); a
 * target can be attached only once per field — enforced in the database
 * so concurrent attachments cannot double-link a record.
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
    uniqueIndex("relationships_target_uq").on(t.fromId, t.kind, t.toId),
    uniqueIndex("relationships_one_ref_uq")
      .on(t.fromId, t.kind)
      .where(sql`kind in ('campaign', 'chapter', 'capital', 'headquarters', 'origin')`),
    index("relationships_to_idx").on(t.toId, t.kind),
  ],
);

/**
 * `@slug` mentions parsed from record bodies on save (PRE-SPEC.md §6).
 * Rows reference the target by slug text — a deleted target keeps its
 * rows so the rendering marks the mention as a dead link.
 */
export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    targetSlug: text("target_slug").notNull(),
  },
  (t) => [
    index("mentions_entity_idx").on(t.entityId),
    index("mentions_target_idx").on(t.targetSlug),
  ],
);

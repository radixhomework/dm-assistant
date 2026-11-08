import { z } from "zod";

export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

/**
 * Instance configuration (see PRE-SPEC.md §2).
 * Parsed once at bootstrap — invalid values abort startup with the
 * offending variable names.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgres://dm:dm@localhost:5432/dm_assistant"),
  UI_LOCALE: z.enum(locales).default("en"),
  AUTHORING_LOCALE: z.enum(locales).default("en"),
  SESSION_SECRET: z.string().min(16).default("dev-only-session-secret"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof envSchema>;

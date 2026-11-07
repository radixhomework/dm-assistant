import type { Env } from "@dm/schemas";

/**
 * Injection token for the validated instance configuration.
 * Parsed once in main.ts (fail-fast) and provided app-wide.
 */
export const ENV = "APP_ENV";

export type { Env };

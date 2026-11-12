import { proseFieldKeys, statisticsSchema } from "@dm/schemas";

export type FieldKind =
  | "prose"
  | "text"
  | "numericString"
  | "money"
  | "calendarDate"
  | "recurrence"
  | "enum"
  | "order"
  | "statistics"
  | "asset";

type SchemaNode = { def?: { type?: string; innerType?: SchemaNode; shape?: Record<string, unknown>; entries?: Record<string, unknown> } };

function unwrap(schema: unknown): SchemaNode {
  let current = schema as SchemaNode;
  for (let depth = 0; depth < 6; depth += 1) {
    const def = current.def ?? {};
    if (def.type === "optional" || def.type === "default" || def.type === "nullable") {
      current = def.innerType as SchemaNode;
      continue;
    }
    return current;
  }
  return current;
}

function objectKeys(schema: unknown): string[] | null {
  const inner = unwrap(schema);
  const def = (inner as { def?: { type?: string; shape?: Record<string, unknown> } }).def;
  if (def?.type !== "object" || !def.shape) return null;
  return Object.keys(def.shape);
}

function enumValues(schema: unknown): string[] | null {
  const inner = unwrap(schema);
  const def = (inner as { def?: { type?: string; entries?: Record<string, unknown> } }).def;
  if (def?.type !== "enum" || !def.entries) return null;
  return Object.keys(def.entries);
}

/**
 * Classifies a template field for form rendering, from the schema's zod
 * shape: objects are discriminated by their keys (money, calendar date,
 * recurrence, statistics), enums become selects, arrays are slug lists,
 * numbers are the play order, and strings split into prose vs short text
 * by key (the template's semantic intent).
 */
export function classifyField(key: string, schema: unknown): FieldKind {
  const keys = objectKeys(schema);
  if (keys) {
    if (keys.includes("amount") && keys.includes("currency")) return "money";
    if (keys.includes("era") || (keys.includes("year") && keys.includes("month"))) return "calendarDate";
    if (keys.includes("unit") && keys.includes("interval")) return "recurrence";
    if (keys.includes("strength")) return "statistics";
    return "text";
  }
  if (enumValues(schema)) return "enum";
  const inner = unwrap(schema);
  const def = (inner as { def?: { type?: string } }).def;
  if (def?.type === "number") return "order";
  if (def?.type === "array") return "statistics"; // slug lists: damage-type refs
  if (proseFieldKeys.has(key)) return "prose";
  if (key === "illustration") return "asset";
  return "text";
}

/** The enum value list for an enum field (undefined otherwise). */
export function enumOptions(schema: unknown): string[] | null {
  return enumValues(schema);
}

export { statisticsSchema };


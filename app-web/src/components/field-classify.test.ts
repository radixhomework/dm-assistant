import { describe, expect, it } from "vitest";
import { classifyField, enumOptions } from "./field-classify.js";
import { templateSchemaOf } from "@dm/schemas";

/** The zod shape of a template, for key → schema lookup. */
function shapeOf(type: string): Record<string, unknown> {
  const template = templateSchemaOf(type)!;
  return (template.fields as unknown as { shape: Record<string, unknown> }).shape;
}

/** A minimal schema node matching the structural introspection contract. */
function node(def: Record<string, unknown>): unknown {
  return { def };
}

describe("classifyField — structured vocabularies (real templates)", () => {
  it("classifies money (equipment value)", () => {
    const shape = shapeOf("equipment-and-items");
    expect(classifyField("value", shape.value)).toBe("money");
  });

  it("classifies calendar dates and recurrence (events)", () => {
    const shape = shapeOf("events");
    expect(classifyField("start", shape.start)).toBe("calendarDate");
    expect(classifyField("end", shape.end)).toBe("calendarDate");
    expect(classifyField("recurrence", shape.recurrence)).toBe("recurrence");
  });

  it("classifies statistics (monsters)", () => {
    const shape = shapeOf("monsters");
    expect(classifyField("statistics", shape.statistics)).toBe("statistics");
  });

  it("classifies enums, prose, asset and text (places)", () => {
    const shape = shapeOf("places");
    expect(classifyField("place_type", shape.place_type)).toBe("enum");
    expect(classifyField("public_description", shape.public_description)).toBe("prose");
    expect(classifyField("private_description", shape.private_description)).toBe("prose");
    expect(classifyField("illustration", shape.illustration)).toBe("asset");
    expect(classifyField("population", shape.population)).toBe("text");
  });

  it("classifies a plain object with unmatched keys as text", () => {
    expect(classifyField("misc", node({ type: "object", shape: { foo: {} } }))).toBe("text");
  });
});

describe("classifyField — introspection fallbacks (hand-built nodes)", () => {
  it("classifies numbers as the play order", () => {
    expect(classifyField("order", node({ type: "number" }))).toBe("order");
  });

  it("classifies arrays as slug-list statistics", () => {
    expect(classifyField("targets", node({ type: "array" }))).toBe("statistics");
  });

  it("unwraps optional → default → inner chains before reading the type", () => {
    const chained = node({
      type: "optional",
      innerType: node({
        type: "default",
        innerType: node({ type: "number" }),
      }),
    });
    expect(classifyField("order", chained)).toBe("order");
  });

  it("classifies hand-built enums and lists their options", () => {
    const schema = node({ type: "enum", entries: { village: {}, city: {} } });
    expect(classifyField("place_type", schema)).toBe("enum");
    expect(enumOptions(schema)).toEqual(["village", "city"]);
  });
});

describe("enumOptions", () => {
  it("returns the real template enum values in declaration order", () => {
    expect(enumOptions(shapeOf("places").place_type)).toEqual([
      "intangible_place",
      "locality",
      "city",
    ]);
  });

  it("returns null for non-enum schemas", () => {
    expect(enumOptions(shapeOf("places").population)).toBeNull();
  });
});

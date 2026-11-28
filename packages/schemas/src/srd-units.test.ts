import { describe, expect, it } from "vitest";
import {
  convertSrdFeet,
  convertSrdGallons,
  convertSrdMiles,
  convertSrdPounds,
  convertSrdUnits,
} from "./srd-units.js";

const metric = { distanceUnit: "m", weightUnit: "kg", volumeUnit: "L" } as const;
const imperial = { distanceUnit: "ft", weightUnit: "lb", volumeUnit: "gal" } as const;

describe("SRD unit conversion (exact barème arithmetic)", () => {
  it("converts feet to meters through the 5 ft = 1.5 m barème", () => {
    expect(convertSrdFeet(30, "m")).toBe(9);
    expect(convertSrdFeet(5, "m")).toBe(1.5);
    expect(convertSrdFeet(25, "m")).toBe(7.5);
    expect(convertSrdFeet(10, "m")).toBe(3);
  });

  it("keeps fractional results exact", () => {
    // 30 × 0.3 in floating point would give 9.000000000000002 — the
    // barème arithmetic (×1.5 ÷5) stays exact.
    expect(convertSrdFeet(30, "m")).not.toBe(9.000000000000002);
    expect(convertSrdFeet(1, "m")).toBe(0.3);
  });

  it("identity-converts when the world already uses imperial", () => {
    expect(convertSrdFeet(30, "ft")).toBe(30);
    expect(convertSrdMiles(2, "ft")).toBe(2);
    expect(convertSrdPounds(120, "lb")).toBe(120);
    expect(convertSrdGallons(3, "gal")).toBe(3);
  });

  it("converts miles, pounds and gallons through the barème", () => {
    expect(convertSrdMiles(1, "m")).toBe(1500);
    expect(convertSrdMiles(2, "m")).toBe(3000);
    expect(convertSrdPounds(1, "kg")).toBe(0.5);
    expect(convertSrdPounds(2, "kg")).toBe(1);
    expect(convertSrdGallons(1, "L")).toBe(4);
    expect(convertSrdGallons(2, "L")).toBe(8);
  });
});

describe("convertSrdUnits (fields walker)", () => {
  it("converts the Statistics block's speed and senses into the world's units", () => {
    const fields = {
      public_description: "Speed 30 feet, darkvision 60 feet.",
      statistics: {
        speed: { walk: 30, fly: 60 },
        senses: { darkvision: 60 },
      },
    };
    const converted = convertSrdUnits(fields, metric);
    expect(converted.statistics).toEqual({
      speed: { walk: 9, fly: 18 },
      senses: { darkvision: 18 },
    });
    // Prose is never rewritten (charter rule 1).
    expect(converted.public_description).toBe(fields.public_description);
  });

  it("identity-converts the Statistics block for an imperial world", () => {
    const fields = {
      statistics: { speed: { walk: 30 }, senses: { darkvision: 60 } },
    };
    const converted = convertSrdUnits(fields, imperial);
    expect(converted.statistics).toEqual(fields.statistics);
  });

  it("passes fields without a Statistics block through untouched", () => {
    const fields = { pitch: "A hook." };
    expect(convertSrdUnits(fields, metric)).toBe(fields);
  });
});

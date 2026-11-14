import { describe, expect, it } from "vitest";
import { diceAverage, parseDice } from "./dice.js";

describe("dice formulas", () => {
  it("parses NdM, NdM+K and NdM-K", () => {
    expect(parseDice("2d8")).toEqual({ count: 2, faces: 8, modifier: 0 });
    expect(parseDice("3d6+2")).toEqual({ count: 3, faces: 6, modifier: 2 });
    expect(parseDice("1d20-1")).toEqual({ count: 1, faces: 20, modifier: -1 });
    expect(parseDice("d12")).toEqual({ count: 1, faces: 12, modifier: 0 });
  });

  it("rejects formulas that do not parse", () => {
    expect(parseDice("banana")).toBeNull();
    expect(parseDice("2d")).toBeNull();
    expect(parseDice("d")).toBeNull();
  });

  it("computes the stat-block average (floored dice, then modifier)", () => {
    expect(diceAverage("3d6+2")).toBe(12);
    expect(diceAverage("2d8+6")).toBe(15);
    expect(diceAverage("1d20")).toBe(10);
    expect(diceAverage("1d20-1")).toBe(9);
    expect(diceAverage("banana")).toBeNull();
  });
});

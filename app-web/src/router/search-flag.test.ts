import { describe, expect, it } from "vitest";
import { searchFlagTrue } from "./search-flag.js";

describe("searchFlagTrue", () => {
  it("accepts the numeric, string and boolean forms of the flag", () => {
    expect(searchFlagTrue({ new: 1 }, "new")).toBe(true);
    expect(searchFlagTrue({ new: "1" }, "new")).toBe(true);
    expect(searchFlagTrue({ new: true }, "new")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(searchFlagTrue({ new: "true" }, "new")).toBeUndefined();
    expect(searchFlagTrue({ new: 0 }, "new")).toBeUndefined();
    expect(searchFlagTrue({ new: "0" }, "new")).toBeUndefined();
    expect(searchFlagTrue({ new: false }, "new")).toBeUndefined();
    expect(searchFlagTrue({ new: undefined }, "new")).toBeUndefined();
    expect(searchFlagTrue({}, "new")).toBeUndefined();
  });
});

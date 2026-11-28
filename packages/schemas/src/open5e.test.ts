import { describe, expect, it } from "vitest";
import {
  mapOpen5eObject,
  open5eObjectSchema,
  open5eEnvelopeSchema,
} from "./open5e.js";

/** A verbatim Open5e v2 sample (SRD 5.2 conditions live under the
 * `core` document with per-document description entries). */
const srd2024Condition = {
  key: "blinded",
  document: {
    name: "5e Core Concepts",
    key: "core",
    type: "SOURCE",
    display_name: "5e Core Concepts",
    publisher: { name: "Open5e", key: "open5e" },
    gamesystem: { name: "5th Edition 2024", key: "5e-2024" },
    permalink: "https://open5e.com",
  },
  icon: null,
  descriptions: [
    {
      desc: "A5E text you cannot rely on.",
      document: "a5e-ag",
      gamesystem: "a5e",
    },
    {
      desc: "* You can't see...",
      document: "srd-2024",
      gamesystem: "5e-2024",
    },
  ],
  name: "Blinded",
};

describe("open5eObjectSchema", () => {
  it("accepts the v2 object shape with mechanical extras", () => {
    const parsed = open5eObjectSchema.safeParse(srd2024Condition);
    expect(parsed.success).toBe(true);
  });

  it("accepts flattened exports carrying a bare desc string", () => {
    const parsed = open5eObjectSchema.safeParse({
      slug: "blinded",
      name: "Blinded",
      desc: "* You can't see.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an object without a stable slug key", () => {
    const parsed = open5eObjectSchema.safeParse({
      name: "Blinded",
      desc: "text",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an object without any text", () => {
    const parsed = open5eObjectSchema.safeParse({
      key: "blinded",
      name: "Blinded",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects malformed elements (missing name, non-array descriptions)", () => {
    expect(
      open5eObjectSchema.safeParse({ key: "x", name: "", desc: "t" }).success,
    ).toBe(false);
    expect(
      open5eObjectSchema.safeParse({ key: "x", name: "X", descriptions: "no" }).success,
    ).toBe(false);
  });

  it("understands the Open5e paginated envelope", () => {
    const parsed = open5eEnvelopeSchema.safeParse({
      count: 21,
      next: "https://api.open5e.com/v2/conditions/?page=2",
      previous: null,
      results: [srd2024Condition],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("mapOpen5eObject", () => {
  it("maps name to title, the slug key to slug, and picks the chosen document", () => {
    const mapped = mapOpen5eObject(open5eObjectSchema.parse(srd2024Condition));
    expect(mapped).toEqual({
      title: "Blinded",
      slug: "blinded",
      publicDescription: "* You can't see...",
    });
  });

  it("falls back to the bare desc of flattened exports", () => {
    const mapped = mapOpen5eObject(
      open5eObjectSchema.parse({ slug: "blinded", name: "Blinded", desc: "text" }),
    );
    expect(mapped.publicDescription).toBe("text");
  });

  it("flags elements carrying no text for the chosen document", () => {
    // A document-scoped row of another source: no srd-2024 entry, no desc.
    const mapped = mapOpen5eObject(
      open5eObjectSchema.parse({
        key: "a5e-ag_bloodied",
        name: "Bloodied",
        descriptions: [{ desc: "EN Publishing text.", document: "a5e-ag" }],
      }),
    );
    expect(mapped.publicDescription).toBeNull();
  });

  it("treats an untagged descriptions array as the dataset's document", () => {
    const mapped = mapOpen5eObject(
      open5eObjectSchema.parse({
        key: "blinded",
        name: "Blinded",
        descriptions: [{ desc: "Single-document export." }],
      }),
    );
    expect(mapped.publicDescription).toBe("Single-document export.");
  });

  it("maps the slug fallback when key is absent", () => {
    const mapped = mapOpen5eObject(
      open5eObjectSchema.parse({ slug: "a-condition", name: "A condition", desc: "t" }),
    );
    expect(mapped.slug).toBe("a-condition");
  });
});

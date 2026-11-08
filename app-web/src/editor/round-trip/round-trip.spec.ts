import { describe, expect, it } from "vitest";
import { canonicalizeMarkdown, markdownEquals } from "./canonicalize.js";
import { loadCommittedCorpus, loadLocalCorpus } from "./corpus.js";
import { roundTrip } from "./round-trip.js";

describe("canonicalizeMarkdown", () => {
  it("converts CRLF line endings to LF", () => {
    expect(canonicalizeMarkdown("a\r\nb\r\n")).toBe("a\nb\n");
  });

  it("reduces trailing newlines to exactly one", () => {
    expect(canonicalizeMarkdown("a\n\n\n\n")).toBe("a\n");
    expect(canonicalizeMarkdown("a")).toBe("a\n");
  });

  it("preserves line-trailing spaces (hard-break syntax)", () => {
    expect(canonicalizeMarkdown("a  \nb\n")).toBe("a  \nb\n");
  });

  it("keeps an empty string empty", () => {
    expect(canonicalizeMarkdown("")).toBe("");
  });
});

describe("markdownEquals", () => {
  it("accepts byte-identical strings", () => {
    expect(markdownEquals("a\nb\n", "a\nb\n")).toBe(true);
  });

  it("rejects strings differing in bytes only", () => {
    // NFC é (U+00E9) vs NFD e + combining acute (U+0301): same rendering,
    // different bytes — storage fidelity is judged on bytes.
    expect(markdownEquals("caf\u00e9", "cafe\u0301")).toBe(false);
  });

  it("rejects a missing trailing newline", () => {
    expect(markdownEquals("a\n", "a")).toBe(false);
  });
});

describe("round-trip smoke", () => {
  it("instantiates a headless editor and round-trips a simple document", () => {
    expect(canonicalizeMarkdown(roundTrip("**Bold** paragraph.\n"))).toBe("**Bold** paragraph.\n");
  });
});

describe("committed corpus — empty-diff bar", () => {
  for (const doc of loadCommittedCorpus()) {
    it(`reproduces ${doc.path} byte-for-byte`, () => {
      const expected = canonicalizeMarkdown(doc.content);
      expect(canonicalizeMarkdown(roundTrip(doc.content)), `round-trip failed for ${doc.path}`).toBe(expected);
    });
  }
});

describe("local corpus — empty-diff bar", () => {
  const docs = loadLocalCorpus();
  if (docs.length === 0) {
    it.skip("no local documents present (corpus-local is empty)");
    return;
  }
  for (const doc of docs) {
    it(`reproduces ${doc.path} byte-for-byte`, () => {
      const expected = canonicalizeMarkdown(doc.content);
      expect(canonicalizeMarkdown(roundTrip(doc.content)), `round-trip failed for ${doc.path}`).toBe(expected);
    });
  }
});

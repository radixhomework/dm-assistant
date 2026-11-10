import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFromPath, loadLocalCorpus } from "./corpus.js";

describe("corpus loaders", () => {
  it("loads a single markdown file from an explicit path", () => {
    const dir = mkdtempSync(join(tmpdir(), "rt-corpus-"));
    const file = join(dir, "note.md");
    writeFileSync(file, "# Note\n", "utf8");
    const docs = loadFromPath(file);
    expect(docs).toHaveLength(1);
    expect(docs[0].content).toBe("# Note\n");
  });

  it("loads every markdown file of a folder", () => {
    const dir = mkdtempSync(join(tmpdir(), "rt-corpus-"));
    writeFileSync(join(dir, "a.md"), "A\n", "utf8");
    writeFileSync(join(dir, "b.md"), "B\n", "utf8");
    writeFileSync(join(dir, "c.txt"), "ignored\n", "utf8");
    const docs = loadFromPath(dir);
    expect(docs.map((d) => d.path.split(/[\/]/).pop())).toEqual(["a.md", "b.md"]);
  });

  it("rejects an unreadable target path", () => {
    expect(() => loadFromPath("no/such/path")).toThrow();
  });

  it("returns no local documents when corpus-local only has the README", () => {
    // The committed corpus-local holds README + .gitignore only.
    expect(loadLocalCorpus()).toEqual([]);
  });
});

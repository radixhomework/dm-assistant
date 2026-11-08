/// <reference types="node" />

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** A corpus document: its path relative to this module directory, for reporting. */
export type CorpusDocument = {
  path: string;
  content: string;
};

const roundTripDir = import.meta.dirname;

function listMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".md") && statSync(join(dir, name)).isFile());
}

function readDocuments(dir: string, keepName: (name: string) => boolean): CorpusDocument[] {
  return listMarkdownFiles(dir)
    .filter(keepName)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      path: relative(roundTripDir, join(dir, name)),
      content: readFileSync(join(dir, name), "utf8"),
    }));
}

/** Committed one-construct fixtures. */
export function loadConstructs(): CorpusDocument[] {
  return readDocuments(join(roundTripDir, "corpus"), () => true);
}

/** Committed composite documents shaped like real template bodies. */
export function loadComposites(): CorpusDocument[] {
  return readDocuments(join(roundTripDir, "corpus", "composites"), () => true);
}

/** Committed custom-node probe fixtures. */
export function loadProbe(): CorpusDocument[] {
  return readDocuments(join(roundTripDir, "corpus", "probe"), () => true);
}

/** Every committed document the build gate runs. */
export function loadCommittedCorpus(): CorpusDocument[] {
  return [...loadConstructs(), ...loadComposites(), ...loadProbe()];
}

/**
 * The DM's local real-content folder: gitignored, read when present so the
 * verdict is validated against actual lore. The README is documentation, not
 * a document under test.
 */
export function loadLocalCorpus(): CorpusDocument[] {
  return readDocuments(join(roundTripDir, "corpus-local"), (name) => name !== "README.md");
}

/**
 * Documents from an arbitrary path (file or directory) for the ad-hoc
 * round-trip script — personal documents never touch the committed corpus.
 */
export function loadFromPath(target: string): CorpusDocument[] {
  const absolute = join(process.cwd(), target);
  if (statSync(absolute).isFile()) {
    return [{ path: target, content: readFileSync(absolute, "utf8") }];
  }
  return readDocuments(absolute, () => true).map((doc) => ({
    ...doc,
    path: relative(roundTripDir, join(absolute, doc.path)),
  }));
}

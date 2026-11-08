/// <reference types="node" />

import { afterAll, describe, expect, it } from "vitest";
import { canonicalizeMarkdown } from "./canonicalize.js";
import { loadFromPath, type CorpusDocument } from "./corpus.js";
import { roundTrip } from "./round-trip.js";

/**
 * Ad-hoc round-trip runner — excluded from the default test suite (see
 * vitest.config.ts). Runs the empty-diff bar over personal documents:
 *
 *   npm run round-trip -w app-web                      # corpus-local (default)
 *   ROUND_TRIP_PATH=/path/to/doc.md npm run round-trip -w app-web
 */

const target = process.env.ROUND_TRIP_PATH;

function diffLine(line: string): string {
  // Make trailing whitespace visible: it is hard-break syntax.
  return line.replace(/[ \t]+$/, (ws) => ws.replace(/ /g, "␠").replace(/\t/g, "⇥"));
}

/** Minimal LCS line diff: `-` editor output, `+` original document. */
function diffLines(output: string, original: string): string[] {
  const a = output.split("\n");
  const b = original.split("\n");
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push(`  ${diffLine(a[i])}`);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(`- ${diffLine(a[i])}`);
      i++;
    } else {
      out.push(`+ ${diffLine(b[j])}`);
      j++;
    }
  }
  while (i < a.length) out.push(`- ${diffLine(a[i++])}`);
  while (j < b.length) out.push(`+ ${diffLine(b[j++])}`);
  return out;
}

const failures: Array<{ path: string; diff: string[] }> = [];

describe("ad-hoc round-trip", () => {
  let docs: CorpusDocument[];

  try {
    docs = target ? loadFromPath(target) : [];
  } catch (error) {
    docs = [];
    it(`resolves the target path (${target})`, () => {
      throw new Error(`ROUND_TRIP_PATH does not point to a readable markdown file or folder: ${String(error)}`);
    });
  }

  if (!target && docs.length === 0) {
    it.skip("no target given and corpus-local is empty — drop documents there or set ROUND_TRIP_PATH");
  }

  for (const doc of docs) {
    it(`reproduces ${doc.path} byte-for-byte`, () => {
      const output = roundTrip(doc.content);
      const expected = canonicalizeMarkdown(doc.content);
      if (canonicalizeMarkdown(output) !== expected) {
        failures.push({ path: doc.path, diff: diffLines(canonicalizeMarkdown(output), expected) });
      }
      expect(canonicalizeMarkdown(output), `round-trip failed for ${doc.path}`).toBe(expected);
    });
  }

  afterAll(() => {
    if (docs.length === 0) return;
    console.log(`round-trip: ${docs.length - failures.length}/${docs.length} documents pass the empty-diff bar`);
    for (const failure of failures) {
      console.log(`--- diff for ${failure.path} (- editor output / + original) ---`);
      console.log(failure.diff.join("\n"));
    }
  });
});

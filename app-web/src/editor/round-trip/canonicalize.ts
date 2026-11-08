/// <reference types="node" />

/**
 * Canonical markdown form used for round-trip comparison: UTF-8 text with LF
 * line endings and exactly one trailing newline. Line-trailing spaces are
 * preserved on purpose — two trailing spaces are hard-break syntax.
 */
export function canonicalizeMarkdown(markdown: string): string {
  const lf = markdown.replace(/\r\n/g, "\n");
  return lf === "" ? "" : `${lf.replace(/\n+$/, "")}\n`;
}

/**
 * Byte-for-byte equality of two markdown strings. No Unicode normalization:
 * canonically-equivalent but differently-encoded characters count as
 * different, so storage fidelity is judged on real bytes.
 */
export function markdownEquals(a: string, b: string): boolean {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8")) === 0;
}

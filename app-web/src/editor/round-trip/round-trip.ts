import { Editor, type AnyExtension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { AttentionPoint } from "./attention-point.js";

/**
 * Plan A editor extension set used for every round-trip run: the official
 * markdown extension (ARCHITECTURE.md §2), starter-kit core marks and nodes,
 * table and image support required by the corpus, and the custom-node probe.
 */
export function roundTripExtensions(): AnyExtension[] {
  return [Markdown, StarterKit, Table, TableRow, TableCell, TableHeader, Image, AttentionPoint];
}

/**
 * Headless editor for round-trip checks: no element, no UI, usable under
 * vitest (jsdom) and plain Node with a DOM shim.
 */
export function createRoundTripEditor(extensions: AnyExtension[] = roundTripExtensions()): Editor {
  return new Editor({ extensions });
}

/**
 * One markdown round trip: parse into the editor document model, serialize
 * back to markdown. The acceptance bar lives in the callers (empty diff
 * against the canonical input), not here.
 */
export function roundTrip(markdown: string, extensions: AnyExtension[] = roundTripExtensions()): string {
  const editor = createRoundTripEditor(extensions);
  try {
    editor.commands.setContent(markdown, { contentType: "markdown" });
    return editor.getMarkdown();
  } finally {
    editor.destroy();
  }
}

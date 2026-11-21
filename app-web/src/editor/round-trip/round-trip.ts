import { Editor, type AnyExtension } from "@tiptap/core";
import { buildExtensions } from "../extensions.js";

/**
 * Plan A editor extension set used for every round-trip run: the shared
 * buildExtensions() configuration is the one the mounted editor uses, so
 * the suite validates the real editor.
 */
export function roundTripExtensions(): AnyExtension[] {
  return buildExtensions();
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

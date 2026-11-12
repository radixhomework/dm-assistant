import { Editor } from "@tiptap/core";
import { buildExtensions } from "./extensions.js";

/**
 * Renders stored markdown to HTML for the reading views, through the same
 * gated extension pipeline the editor uses (identical rendering either
 * side of a save). A fresh headless editor per call — record sheets are
 * small, and caching belongs to the caller.
 */
export function renderMarkdownToHtml(markdown: string): string {
  const editor = new Editor({ extensions: buildExtensions() });
  try {
    editor.commands.setContent(markdown, { contentType: "markdown" });
    return editor.getHTML();
  } finally {
    editor.destroy();
  }
}

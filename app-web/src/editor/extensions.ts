import { type AnyExtension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { AttentionPoint, Mechanics } from "./typed-blocks.js";
import { RecordMention } from "./mention-node.js";

/**
 * The single source of truth for the editor's extension set: the mounted
 * ProseEditor and the headless round-trip harness share this exact
 * configuration, so the suite validates the editor the DM actually uses.
 */
export function buildExtensions(): AnyExtension[] {
  return [
    Markdown,
    StarterKit.configure({
      // No silent autolinking: emails stay plain text (the mention word-start
      // rule already keeps them out of mentions); markdown autolinks <url>
      // still parse through the link node.
      link: { autolink: false },
    }),
    Table,
    TableRow,
    TableCell,
    TableHeader,
    Image,
    AttentionPoint,
    Mechanics,
    RecordMention,
  ];
}

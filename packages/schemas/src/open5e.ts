import { z } from "zod";

/**
 * Open5e dataset shapes (srd-catalog-import capability): the import
 * consumes public datasets following the Open5e object shape — at
 * minimum a name, a stable slug key and the text descriptions — no
 * application-specific field required. Verified against the Open5e v2
 * API (https://api.open5e.com/v2, see docs/srd-import.md): objects
 * carry `key` (slug-charset, stable across title changes) and a
 * `descriptions[]` array of per-document `{desc, document, gamesystem}`
 * entries; flattened exports carry a bare `desc` string instead. The
 * payload is a bare array or the Open5e paginated envelope
 * (`results[]` + `next`). Mechanical extras are ignored: the mapping
 * reads only what the catalog templates hold.
 */

export const open5eDescriptionSchema = z
  .object({
    desc: z.string(),
    document: z.string().optional(),
    gamesystem: z.string().optional(),
  })
  .loose();

export const open5eObjectSchema = z
  .object({
    name: z.string().min(1),
    key: z.string().optional(),
    slug: z.string().optional(),
    desc: z.string().optional(),
    descriptions: z.array(open5eDescriptionSchema).optional(),
  })
  .loose()
  .refine(
    (object) => object.key !== undefined || object.slug !== undefined,
    "an Open5e object carries a stable slug key (key or slug)",
  );

/**
 * Whether a row carrying NO text for the chosen document provably
 * belongs to another document: the row-level document relationship
 * (classes are document-scoped rows) or document-tagged description
 * entries. Such rows stay out when their document does not match —
 * importing them would mislabel third-party content under the
 * importing source. Rows carrying no text at all (SRD base classes,
 * documented through their features) pass: they import as
 * description-less records.
 */
export function belongsToOtherDocument(
  object: z.infer<typeof open5eObjectSchema>,
  document: string,
): boolean {
  const rowDocument: unknown = object.document;
  const rowKey =
    typeof rowDocument === "string"
      ? rowDocument
      : typeof rowDocument === "object" &&
          rowDocument !== null &&
          typeof (rowDocument as { key?: unknown }).key === "string"
        ? (rowDocument as { key: string }).key
        : undefined;
  if (rowKey !== undefined) {
    return rowKey !== document;
  }
  return (object.descriptions ?? []).some(
    (entry) => entry.document !== undefined,
  );
}

/** The Open5e paginated envelope; the import follows `next` server-side
 * with a page cap (the bare-array payload bypasses it). */
export const open5eEnvelopeSchema = z
  .object({
    results: z.array(z.unknown()),
    next: z.string().nullable().optional(),
    count: z.number().optional(),
  })
  .loose();

/** One mapped element: what the catalog record receives from the
 * dataset — the descriptions entry of the chosen document becomes the
 * Public description; Pitch and Private description stay DM-authored. */
export type Open5eMapped = {
  title: string;
  slug: string;
  publicDescription: string | null;
};

/** The descriptions entry for the chosen document, then the bare `desc`
 * of flattened exports; null when the dataset carries no text for the
 * element (the preview flags it). */
export function chooseOpen5eDescription(
  object: z.infer<typeof open5eObjectSchema>,
  document: string,
): string | null {
  if (object.descriptions !== undefined && object.descriptions.length > 0) {
    const tagged = object.descriptions.some(
      (entry) => entry.document !== undefined,
    );
    if (!tagged) {
      // A flattened descriptions array: a single-document dataset.
      return object.descriptions[0].desc;
    }
    const match = object.descriptions.find(
      (entry) => entry.document === document,
    );
    if (match !== undefined) return match.desc;
  }
  if (object.desc !== undefined && object.desc.trim().length > 0) {
    return object.desc;
  }
  return null;
}

export function mapOpen5eObject(
  object: z.infer<typeof open5eObjectSchema>,
  document = "srd-2024",
): Open5eMapped {
  return {
    title: object.name,
    slug: object.key ?? object.slug!,
    publicDescription: chooseOpen5eDescription(object, document),
  };
}

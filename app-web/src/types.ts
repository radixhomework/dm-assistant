export type Entity = {
  id: string;
  slug: string;
  type: string;
  perimeter: "world" | "campaign";
  title: string;
  tags: string[];
  fields: Record<string, unknown>;
  /** Provenance for catalog records only (srd-catalog-import): the
   * built-in Internal source or the named external source an import
   * bound; null elsewhere. The sheet splits the badge and the edit
   * surface on it. */
  source?: { id: string; name: string; internal: boolean } | null;
  tracking?: { id?: string; slug: string; status: string; children: ChildView[] };
  references?: Record<
    string,
    Array<{ id: string; slug: string; title: string; type?: string }>
  >;
  /** The campaign owning this record (itself for a campaign); null on
   * world-perimeter records. Resolved server-side on read. */
  campaign?: { id?: string; slug: string; title: string } | null;
};

export type ChildView = {
  id: string;
  slug: string;
  title: string;
  status: string;
  children?: ChildView[];
};

export type WorldTemplate =
  | "characters-and-entities"
  | "places"
  | "organizations"
  | "monsters"
  | "nations"
  | "natural-landmarks"
  | "works"
  | "events"
  | "equipment-and-items"
  | "beliefs-myths-and-customs"
  | "knowledge-and-technologies"
  | "game-rules";

/** The eight catalogs (P3 fills them from the SRD; DM-created ones are
 * editable). They are world-perimeter records too, listed in a separate
 * Lore section. */
export const catalogTemplates = [
  "classes",
  "species",
  "conditions",
  "damage-types",
  "treasure-types",
  "languages",
  "fauna",
  "flora",
] as const;
export type CatalogTemplate = (typeof catalogTemplates)[number];

export const worldTemplates: WorldTemplate[] = [
  "characters-and-entities",
  "places",
  "organizations",
  "monsters",
  "nations",
  "natural-landmarks",
  "works",
  "events",
  "equipment-and-items",
  "beliefs-myths-and-customs",
  "knowledge-and-technologies",
  "game-rules",
];

export type SafeUserLike = {
  id: string;
  username?: string | null;
  email: string;
  displayName: string;
  role: "admin" | "dm";
  status: "active" | "blocked";
  uiLocale?: "en" | "fr" | null;
};

export type Entity = {
  id: string;
  slug: string;
  type: string;
  perimeter: "world" | "campaign";
  title: string;
  tags: string[];
  fields: Record<string, unknown>;
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

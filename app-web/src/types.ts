export type Entity = {
  id: string;
  slug: string;
  type: string;
  perimeter: "world" | "campaign";
  title: string;
  tags: string[];
  fields: Record<string, unknown>;
  body: string;
  tracking?: { slug: string; status: string; children: ChildView[] };
  references?: Record<string, Array<{ slug: string; title: string }>>;
};

export type ChildView = {
  slug: string;
  title: string;
  status: string;
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

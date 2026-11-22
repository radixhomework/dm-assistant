import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  proseFieldKeys,
  templateSchemaOf,
  type CreateEntityInput,
  type PlayStatus,
  type UpdateEntityInput,
} from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { isUniqueViolation } from "../database/unique-violation.js";
import { buildSearchVector, extractSearchableText } from "../search/search-index.js";

/** The transaction handle a drizzle transaction callback receives. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
import { entities, mentions, relationships } from "../database/schema.js";
import { RelationshipsService } from "../relationships/relationships.service.js";

export type EntityRow = typeof entities.$inferSelect;

/** A `type` query parameter: one template type or a comma-separated
 * list of them (reference pickers may span several templates). */
function parseTypeFilter(type: string | undefined): string[] {
  return (type ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export type TrackingView = {
  id: string;
  slug: string;
  title: string;
  status: PlayStatus;
  children: TrackingView[];
};

@Injectable()
export class EntitiesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly relationships: RelationshipsService,
  ) {}

  async create(input: CreateEntityInput, createdBy?: string): Promise<EntityRow> {
    const fields = validateFields(input.type, input.fields ?? {});
    try {
      // The record, its mention set and its search vector commit
      // together: a failed mention insert rolls the record back instead
      // of stranding it.
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(entities)
          .values({
            ...input,
            fields,
            searchVector: buildSearchVector(input.title, extractSearchableText(fields)),
            createdBy: createdBy ?? null,
          })
          .returning();
        await this.replaceMentions(tx, row.id, fields);
        return row;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Slug '${input.slug}' already exists`);
      }
      throw error;
    }
  }

  /**
   * Resolves a record by its slug **or** its uuid: the routes are
   * uuid-addressed while prose mentions and the mentions table stay
   * slug-keyed, so both identifiers must reach every endpoint.
   */
  async getBySlug(slugOrId: string): Promise<EntityRow> {
    const [row] = await this.db
      .select()
      .from(entities)
      .where(
        or(eq(entities.slug, slugOrId), sql`${entities.id}::text = ${slugOrId}`),
      );
    if (!row) {
      throw new NotFoundException(`Record '${slugOrId}' not found`);
    }
    return row;
  }

  async list(filters?: {
    perimeter?: "world" | "campaign";
    /** One template type or a comma-separated list of them. */
    type?: string;
  }): Promise<EntityRow[]> {
    const conditions = [];
    if (filters?.perimeter) {
      conditions.push(eq(entities.perimeter, filters.perimeter));
    }
    const types = parseTypeFilter(filters?.type);
    if (types.length === 1) {
      conditions.push(eq(entities.type, types[0]));
    } else if (types.length > 1) {
      conditions.push(inArray(entities.type, types));
    }
    return this.db
      .select()
      .from(entities)
      .where(conditions.length > 0 ? and(...conditions) : or())
      .orderBy(entities.type, entities.title);
  }

  async update(slug: string, input: UpdateEntityInput): Promise<EntityRow> {
    // The row read, its lock and the write share one transaction: a
    // concurrent partial save (title-only vs fields-only) must never
    // build the search vector from a stale read (CodeRabbit round-1
    // review — the vector followed fields the write no longer carries).
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(entities)
        .where(or(eq(entities.slug, slug), sql`${entities.id}::text = ${slug}`))
        .for("update");
      if (!existing) {
        throw new NotFoundException(`Record '${slug}' not found`);
      }
      const fields =
        input.fields === undefined
          ? undefined
          : validateFields(existing.type, input.fields);
      // The search vector follows title AND field text: recompute when
      // either is written (a tags-only write leaves it untouched).
      const searchVector =
        input.title !== undefined || fields !== undefined
          ? buildSearchVector(
              input.title ?? existing.title,
              extractSearchableText(fields ?? existing.fields),
            )
          : undefined;
      const [row] = await tx
        .update(entities)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(fields !== undefined ? { fields } : {}),
          ...(searchVector !== undefined ? { searchVector } : {}),
          updatedAt: new Date(),
        })
        .where(eq(entities.id, existing.id))
        .returning();
      // Mentions rebuild from the fields as saved (the payload always
      // carries the full fields object when provided).
      await this.replaceMentions(tx, row.id, row.fields as Record<string, unknown>);
      return row;
    });
  }

  /**
   * Replace-all: the mention set of a record is exactly the mentions of
   * its prose field values (descriptions, running notes…).
   */
  private async replaceMentions(
    tx: Tx,
    entityId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const proseText = Object.entries(fields)
      .filter(([key, value]) => proseFieldKeys.has(key) && typeof value === "string")
      .map(([, value]) => value as string)
      .join("\n");
    const slugs = parseMentionSlugs(proseText);
    await tx.delete(mentions).where(eq(mentions.entityId, entityId));
    if (slugs.length > 0) {
      await tx.insert(mentions).values(slugs.map((slug) => ({ entityId, targetSlug: slug })));
    }
  }

  /**
   * The campaign owning a record: the record itself for a campaign,
   * otherwise the campaign found by walking the child→parent links
   * (chapter → campaign, scene → chapter → campaign). Bounded walk;
   * null for world-perimeter records or unattached ones.
   */
  async campaignOf(
    record: EntityRow,
  ): Promise<{ id: string; slug: string; title: string } | null> {
    if (record.type === "campaign") {
      return { id: record.id, slug: record.slug, title: record.title };
    }
    let current: { id: string } = record;
    for (let depth = 0; depth < 4; depth += 1) {
      const [parent] = await this.db
        .select({
          id: entities.id,
          slug: entities.slug,
          title: entities.title,
          type: entities.type,
        })
        .from(relationships)
        .innerJoin(entities, eq(relationships.toId, entities.id))
        .where(eq(relationships.fromId, current.id))
        .limit(1);
      if (!parent) return null;
      if (parent.type === "campaign") {
        return { id: parent.id, slug: parent.slug, title: parent.title };
      }
      current = parent;
    }
    return null;
  }

  /**
   * Outgoing references of a record, grouped by relationship kind (the
   * reference field key), each target carrying its slug and current title.
   */
  async referencesOf(
    slug: string,
  ): Promise<
    Record<
      string,
      Array<{ id: string; slug: string; title: string; type: string }>
    >
  > {
    const record = await this.getBySlug(slug);
    const rows = await this.db
      .select({
        kind: relationships.kind,
        id: entities.id,
        slug: entities.slug,
        title: entities.title,
        type: entities.type,
      })
      .from(relationships)
      .innerJoin(entities, eq(relationships.toId, entities.id))
      .where(eq(relationships.fromId, record.id));
    const grouped: Record<
      string,
      Array<{ id: string; slug: string; title: string; type: string }>
    > = {};
    for (const row of rows) {
      const targets = grouped[row.kind] ?? [];
      targets.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        type: row.type,
      });
      grouped[row.kind] = targets;
    }
    return grouped;
  }

  /**
   * Backlinks of a record (records-editor spec, backlinks section):
   * reverse typed references grouped by the referencing field, plus
   * incoming mentions.
   */
  async backlinksOf(
    slug: string,
  ): Promise<{
    fields: Record<
      string,
      Array<{ id: string; slug: string; title: string; type: string; perimeter: string }>
    >;
    mentions: Array<{
      id: string;
      slug: string;
      title: string;
      type: string;
      perimeter: string;
    }>;
  }> {
    const record = await this.getBySlug(slug);
    const rows = await this.db
      .select({
        kind: relationships.kind,
        id: entities.id,
        slug: entities.slug,
        title: entities.title,
        type: entities.type,
        perimeter: entities.perimeter,
      })
      .from(relationships)
      .innerJoin(entities, eq(relationships.fromId, entities.id))
      .where(eq(relationships.toId, record.id));
    const fields: Record<
      string,
      Array<{ id: string; slug: string; title: string; type: string; perimeter: string }>
    > = {};
    for (const row of rows) {
      const targets = fields[row.kind] ?? [];
      targets.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        type: row.type,
        perimeter: row.perimeter,
      });
      fields[row.kind] = targets;
    }
    const mentionRows = await this.db
      .select({
        id: entities.id,
        slug: entities.slug,
        title: entities.title,
        type: entities.type,
        perimeter: entities.perimeter,
      })
      .from(mentions)
      .innerJoin(entities, eq(mentions.entityId, entities.id))
      .where(eq(mentions.targetSlug, record.slug));
    return { fields, mentions: mentionRows };
  }

  async delete(slug: string): Promise<void> {
    const existing = await this.getBySlug(slug);
    await this.relationships.assertNoChildren(existing.id);
    await this.db.delete(entities).where(eq(entities.id, existing.id));
  }

  /**
   * Title autocomplete for mentions (PRE-SPEC.md §6): trigram-backed
   * ILIKE over title and slug, newest-relevant first, capped at 10.
   */
  async autocomplete(
    query: string,
    type?: string,
  ): Promise<Array<{ slug: string; title: string; type: string }>> {
    // Escape ILIKE wildcards so the query matches literally.
    const literal = query.replaceAll(/[%_\\]/g, String.raw`\$&`);
    const conditions = [
      or(ilike(entities.title, `%${literal}%`), ilike(entities.slug, `%${literal}%`)),
    ];
    const types = parseTypeFilter(type);
    if (types.length === 1) {
      conditions.push(eq(entities.type, types[0]));
    } else if (types.length > 1) {
      conditions.push(inArray(entities.type, types));
    }
    return this.db
      .select({ slug: entities.slug, title: entities.title, type: entities.type })
      .from(entities)
      .where(and(...conditions))
      .orderBy(desc(sql`similarity(${entities.title}, ${query})`))
      .limit(10);
  }

  /** Play tracking with upward aggregation (PRE-SPEC.md §5, rule 9).
   * The fold is recursive: a Campaign folds its Chapters' own aggregated
   * statuses, which fold their Scenes — a leaf keeps its explicit status. */
  async tracking(slug: string, seen: Set<string> = new Set()): Promise<TrackingView> {
    if (seen.has(slug)) {
      return { id: slug, slug, title: "", status: "not_played", children: [] };
    }
    seen.add(slug);
    const record = await this.getBySlug(slug);
    const childKind = childKindOf(record.type);
    if (!childKind) {
      return {
        id: record.id,
        slug,
        title: record.title,
        status: this.statusOf(record.fields),
        children: [],
      };
    }

    const children = await this.relationships.listChildren(slug, childKind);
    // Full recursive subtree: chapters carry their scenes (the campaign
    // tree sidebar renders down to the scenes level).
    const childViews = await Promise.all(
      children.map((child) => this.tracking(child.slug, seen)),
    );
    return {
      id: record.id,
      slug,
      title: record.title,
      status: foldStatuses(childViews.map((c) => c.status)),
      children: childViews,
    };
  }

  statusOf(fields: unknown): PlayStatus {
    const record = (fields ?? {}) as Record<string, unknown>;
    if (record["play_status"] === "in_progress") return "in_progress";
    if (record["play_status"] === "played") return "played";
    return "not_played";
  }
}

/**
 * Three-state fold: all children played means played; any child played
 * or in progress means in progress (work has started); otherwise not
 * played (PRE-SPEC.md §5, rule 9).
 */
export function foldStatuses(statuses: PlayStatus[]): PlayStatus {
  if (statuses.length === 0) return "not_played";
  if (statuses.every((status) => status === "played")) return "played";
  if (statuses.some((status) => status !== "not_played")) return "in_progress";
  return "not_played";
}

/** The hierarchy field key a parent type receives children through
 * (records-editor decision 8): a campaign gathers its chapters through
 * the children's `campaign` field, a chapter its scenes. */
function childKindOf(type: string): "campaign" | "chapter" | null {
  if (type === "campaign") return "campaign";
  if (type === "chapter") return "chapter";
  return null;
}

/**
 * Template-schema validation of the fields JSONB (template-schemas
 * capability): unknown record types keep the P1 structural validation.
 * Reference fields live in the relationships table, never in fields.
 */
/**
 * Extracts @slug mentions from prose text (PRE-SPEC.md §6): the @
 * must start a word (preceded by space, punctuation or line start — an
 * email like user@example.com never triggers) and the slug follows the
 * slug charset until a separator. Deduplicated, order-preserved.
 */
export function parseMentionSlugs(text: string): string[] {
  const found: string[] = [];
  for (const [, slug] of text.matchAll(/(?:^|[^a-zA-Z0-9-])@([a-z0-9-]+)(?=$|[^a-zA-Z0-9-])/g)) {
    if (!found.includes(slug)) found.push(slug);
  }
  return found;
}

function validateFields(
  type: string,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const template = templateSchemaOf(type);
  if (!template) return fields;
  const parsed = template.fields.safeParse(fields);
  if (!parsed.success) {
    throw new BadRequestException({
      code: "fields_invalid",
      message: "fields_invalid",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data as Record<string, unknown>;
}

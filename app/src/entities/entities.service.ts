import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  templateSchemaOf,
  type CreateEntityInput,
  type PlayStatus,
  type UpdateEntityInput,
} from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { entities, mentions } from "../database/schema.js";
import { RelationshipsService } from "../relationships/relationships.service.js";

export type EntityRow = typeof entities.$inferSelect;

export type TrackingView = {
  slug: string;
  status: PlayStatus;
  children: Array<{ slug: string; title: string; status: PlayStatus }>;
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
      const [row] = await this.db
        .insert(entities)
        .values({ ...input, fields, createdBy: createdBy ?? null })
        .returning();
      await this.replaceMentions(row.id, row.body);
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Slug '${input.slug}' already exists`);
      }
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<EntityRow> {
    const [row] = await this.db
      .select()
      .from(entities)
      .where(eq(entities.slug, slug));
    if (!row) {
      throw new NotFoundException(`Record '${slug}' not found`);
    }
    return row;
  }

  async list(filters?: {
    perimeter?: "world" | "campaign";
    type?: string;
  }): Promise<EntityRow[]> {
    const conditions = [];
    if (filters?.perimeter) {
      conditions.push(eq(entities.perimeter, filters.perimeter));
    }
    if (filters?.type) {
      conditions.push(eq(entities.type, filters.type));
    }
    return this.db
      .select()
      .from(entities)
      .where(conditions.length > 0 ? and(...conditions) : or())
      .orderBy(entities.type, entities.title);
  }

  async update(slug: string, input: UpdateEntityInput): Promise<EntityRow> {
    const existing = await this.getBySlug(slug);
    const fields = input.fields === undefined ? undefined : validateFields(existing.type, input.fields);
    const [row] = await this.db
      .update(entities)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(fields !== undefined ? { fields } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        updatedAt: new Date(),
      })
      .where(eq(entities.id, existing.id))
      .returning();
    const body = input.body === undefined ? existing.body : input.body;
    await this.replaceMentions(row.id, body);
    return row;
  }

  /** Replace-all: the mention set of a record is exactly its body's. */
  private async replaceMentions(entityId: string, body: string): Promise<void> {
    const slugs = parseMentionSlugs(body);
    await this.db.delete(mentions).where(eq(mentions.entityId, entityId));
    if (slugs.length > 0) {
      await this.db.insert(mentions).values(slugs.map((slug) => ({ entityId, targetSlug: slug })));
    }
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
    const literal = query.replaceAll(/[%\\_]/g, "\\$&");
    const conditions = [
      or(ilike(entities.title, `%${literal}%`), ilike(entities.slug, `%${literal}%`)),
    ];
    if (type) conditions.push(eq(entities.type, type));
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
      return { slug, status: "not_played", children: [] };
    }
    seen.add(slug);
    const record = await this.getBySlug(slug);
    const childKind = childKindOf(record.type);
    if (!childKind) {
      return { slug, status: this.statusOf(record.fields), children: [] };
    }

    const children = await this.relationships.listChildren(slug, childKind);
    const childViews = await Promise.all(
      children.map(async (child) => ({
        slug: child.slug,
        title: child.title,
        status: (await this.tracking(child.slug, seen)).status,
      })),
    );
    return {
      slug,
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
 * Three-state fold: any in-progress child means in progress; all children
 * played means played; otherwise not played (PRE-SPEC.md §5, rule 9).
 */
export function foldStatuses(statuses: PlayStatus[]): PlayStatus {
  if (statuses.length === 0) return "not_played";
  if (statuses.includes("in_progress")) return "in_progress";
  if (statuses.every((status) => status === "played")) return "played";
  return "not_played";
}

function childKindOf(type: string): "chapter" | "scene" | null {
  if (type === "campaign") return "chapter";
  if (type === "chapter") return "scene";
  return null;
}

/**
 * Template-schema validation of the fields JSONB (template-schemas
 * capability): unknown record types keep the P1 structural validation.
 * Reference fields live in the relationships table, never in fields.
 */
/**
 * Extracts @slug mentions from a markdown body (PRE-SPEC.md §6): the @
 * must start a word (preceded by space, punctuation or line start — an
 * email like user@example.com never triggers) and the slug follows the
 * slug charset until a separator. Deduplicated, order-preserved.
 */
export function parseMentionSlugs(body: string): string[] {
  const found: string[] = [];
  for (const [, slug] of body.matchAll(/(?:^|[^a-z0-9-])@([a-z0-9-]+)(?=$|[^a-z0-9-])/g)) {
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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string; cause?: { code?: string } }).code ===
      "23505" ||
    (error as { cause?: { code?: string } }).cause?.code === "23505" ||
    /duplicate key|unique constraint/i.test(
      error instanceof Error ? error.message : String(error),
    )
  );
}

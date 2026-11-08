import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, or } from "drizzle-orm";
import type {
  CreateEntityInput,
  PlayStatus,
  UpdateEntityInput,
} from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { entities } from "../database/schema.js";
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

  async create(input: CreateEntityInput): Promise<EntityRow> {
    try {
      const [row] = await this.db.insert(entities).values(input).returning();
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
    const [row] = await this.db
      .update(entities)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.fields !== undefined ? { fields: input.fields } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        updatedAt: new Date(),
      })
      .where(eq(entities.id, existing.id))
      .returning();
    return row;
  }

  async delete(slug: string): Promise<void> {
    const existing = await this.getBySlug(slug);
    await this.relationships.assertNoChildren(existing.id);
    await this.db.delete(entities).where(eq(entities.id, existing.id));
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
    const childKind =
      record.type === "campaign"
        ? "chapter"
        : record.type === "chapter"
          ? "scene"
          : null;

    if (!childKind) {
      return { slug, status: this.statusOf(record.fields), children: [] };
    }

    const children = await this.relationships.listChildren(slug, childKind);
    const childViews: Array<{
      slug: string;
      title: string;
      status: PlayStatus;
    }> = [];
    for (const child of children) {
      const childTracking = await this.tracking(child.slug, seen);
      childViews.push({
        slug: child.slug,
        title: child.title,
        status: childTracking.status,
      });
    }
    return {
      slug,
      status: foldStatuses(childViews.map((c) => c.status)),
      children: childViews,
    };
  }

  statusOf(fields: unknown): PlayStatus {
    const record = (fields ?? {}) as Record<string, unknown>;
    if (record["status"] === "in_progress") return "in_progress";
    if (record["status"] === "played") return "played";
    return "not_played";
  }
}

/**
 * Three-state fold: any in-progress child means in progress; all children
 * played means played; otherwise not played (PRE-SPEC.md §5, rule 9).
 */
export function foldStatuses(statuses: PlayStatus[]): PlayStatus {
  if (statuses.length === 0) return "not_played";
  if (statuses.some((status) => status === "in_progress")) return "in_progress";
  if (statuses.every((status) => status === "played")) return "played";
  return "not_played";
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

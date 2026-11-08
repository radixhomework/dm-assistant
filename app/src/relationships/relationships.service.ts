import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { entities, relationships } from "../database/schema.js";

/** Hierarchy kinds: the child→parent link (PRE-SPEC.md §5, rule 8). */
export type HierarchyKind = "chapter" | "scene";

const PARENT_TYPE_BY_KIND: Record<HierarchyKind, string> = {
  chapter: "campaign",
  scene: "chapter",
};

@Injectable()
export class RelationshipsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async attach(
    childSlug: string,
    parentSlug: string,
    kind: HierarchyKind,
  ): Promise<void> {
    const child = await this.entityBySlug(childSlug);
    const parent = await this.entityBySlug(parentSlug);
    if (child.type !== kind) {
      throw new ConflictException(
        `A ${child.type} record cannot carry the '${kind}' hierarchy role`,
      );
    }
    if (parent.type !== PARENT_TYPE_BY_KIND[kind]) {
      throw new ConflictException(
        `A '${kind}' parent must be a ${PARENT_TYPE_BY_KIND[kind]}`,
      );
    }
    try {
      await this.db
        .insert(relationships)
        .values({ fromId: child.id, toId: parent.id, kind });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `${childSlug} already carries a '${kind}' parent`,
        );
      }
      throw error;
    }
  }

  async detach(childSlug: string, kind: HierarchyKind): Promise<void> {
    const child = await this.entityBySlug(childSlug);
    await this.db
      .delete(relationships)
      .where(and(eq(relationships.fromId, child.id), eq(relationships.kind, kind)));
  }

  async listChildren(parentSlug: string, kind: HierarchyKind) {
    const parent = await this.entityBySlug(parentSlug);
    return this.db
      .select({
        slug: entities.slug,
        title: entities.title,
        type: entities.type,
      })
      .from(relationships)
      .innerJoin(entities, eq(relationships.fromId, entities.id))
      .where(
        and(eq(relationships.toId, parent.id), eq(relationships.kind, kind)),
      )
      .orderBy(entities.title);
  }

  /** Refuses deletion of a record that children reference as parent. */
  async assertNoChildren(entityId: string): Promise<void> {
    const [row] = await this.db
      .select({ fromId: relationships.fromId })
      .from(relationships)
      .where(
        and(eq(relationships.toId, entityId), eq(relationships.kind, "chapter")),
      )
      .limit(1);
    if (row) {
      throw new ConflictException(
        "This record has children attached — detach them first",
      );
    }
  }

  /** Children of a parent, used by the tracking aggregation. */
  async childSlugsAndStatuses(
    parentId: string,
    kind: HierarchyKind,
  ): Promise<
    Array<{ slug: string; title: string; fields: Record<string, unknown> }>
  > {
    const rows = await this.db
      .select({
        slug: entities.slug,
        title: entities.title,
        fields: entities.fields,
      })
      .from(relationships)
      .innerJoin(entities, eq(relationships.fromId, entities.id))
      .where(
        and(eq(relationships.toId, parentId), eq(relationships.kind, kind)),
      )
      .orderBy(entities.title);
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      fields: (row.fields ?? {}) as Record<string, unknown>,
    }));
  }

  private async entityBySlug(slug: string) {
    const [row] = await this.db
      .select({ id: entities.id, type: entities.type })
      .from(entities)
      .where(eq(entities.slug, slug));
    if (!row) {
      throw new NotFoundException(`Record '${slug}' not found`);
    }
    return row;
  }
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

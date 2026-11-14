import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { templateSchemaOf } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { entities, relationships } from "../database/schema.js";

/**
 * Typed relationships (records-editor decision 8): every link lives in
 * `relationships (from_id, to_id, kind = field key)`. Hierarchy fields
 * join the same rule — a chapter's `campaign` and a scene's `chapter` —
 * and the template schema's reference declarations (target template +
 * cardinality) drive validation for every field.
 */

/** Hierarchy field keys: the child→parent reference fields. */
export type HierarchyField = "campaign" | "chapter";

@Injectable()
export class RelationshipsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Attaches a reference: `field` must be declared by the child's
   * template, the target must match the declared target template. A 0..1
   * field replaces its previous target; a 0..n field refuses duplicates.
   */
  async attachReference(
    childSlug: string,
    field: string,
    targetSlug: string,
  ): Promise<void> {
    const child = await this.entityBySlug(childSlug);
    const declaration = templateSchemaOf(child.type)?.references[field];
    if (!declaration) {
      throw new NotFoundException(
        `'${field}' is not a reference field of '${child.type}'`,
      );
    }
    const target = await this.entityBySlug(targetSlug);
    if (target.type !== declaration.target) {
      throw new ConflictException(
        `The '${field}' field of a ${child.type} expects a ${declaration.target}`,
      );
    }
    if (declaration.cardinality === "one") {
      // 0..1: the previous link, if any, is replaced.
      await this.db
        .delete(relationships)
        .where(and(eq(relationships.fromId, child.id), eq(relationships.kind, field)));
    } else {
      const [existing] = await this.db
        .select({ id: relationships.id })
        .from(relationships)
        .where(
          and(
            eq(relationships.fromId, child.id),
            eq(relationships.kind, field),
            eq(relationships.toId, target.id),
          ),
        )
        .limit(1);
      if (existing) {
        throw new ConflictException(
          `${targetSlug} is already attached to '${field}'`,
        );
      }
    }
    await this.db
      .insert(relationships)
      .values({ fromId: child.id, toId: target.id, kind: field });
  }

  /** Detaches one target of a field, or all of them when no target. */
  async detachReference(
    childSlug: string,
    field: string,
    targetSlug?: string,
  ): Promise<void> {
    const child = await this.entityBySlug(childSlug);
    const conditions = [
      eq(relationships.fromId, child.id),
      eq(relationships.kind, field),
    ];
    if (targetSlug !== undefined) {
      const target = await this.entityBySlug(targetSlug);
      conditions.push(eq(relationships.toId, target.id));
    }
    await this.db
      .delete(relationships)
      .where(and(...conditions));
  }

  /** Children attached through a hierarchy field, ordered by title. */
  async listChildren(parentSlug: string, field: HierarchyField) {
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
        and(eq(relationships.toId, parent.id), eq(relationships.kind, field)),
      )
      .orderBy(entities.title);
  }

  /** Refuses deletion of a record that children reference as parent. */
  async assertNoChildren(entityId: string): Promise<void> {
    const [row] = await this.db
      .select({ fromId: relationships.fromId })
      .from(relationships)
      .where(
        and(
          eq(relationships.toId, entityId),
          eq(relationships.kind, "campaign"),
        ),
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
    field: HierarchyField,
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
        and(eq(relationships.toId, parentId), eq(relationships.kind, field)),
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

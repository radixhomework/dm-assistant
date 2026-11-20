import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { templateSchemaOf } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { isUniqueViolation } from "../database/unique-violation.js";
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

/** The hierarchy field a child type attaches through (null for
 * non-hierarchy types). */
function hierarchyFieldOf(type: string): HierarchyField | null {
  if (type === "chapter") return "campaign";
  if (type === "scene") return "chapter";
  return null;
}

@Injectable()
export class RelationshipsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Attaches a reference: `field` must be declared by the child's
   * template, the target must match the declared target template. A 0..1
   * field replaces its previous target; a 0..n field refuses duplicates.
   * Hierarchy fields are the exception (design decision 8): a second
   * parent is refused — moving a child means detaching it first.
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
    if (!declaration.targets.includes(target.type)) {
      throw new ConflictException(
        `The '${field}' field of a ${child.type} expects a ${declaration.targets.join(" or a ")}`,
      );
    }
    if (declaration.cardinality === "one") {
      if (hierarchyFieldOf(child.type) === field) {
        await this.attachHierarchyParent(child.id, field, target.id);
        return;
      }
      // 0..1: the previous link, if any, is replaced — delete and insert
      // run in one transaction so a failed insert cannot leave the record
      // detached.
      await this.db.transaction(async (tx) => {
        await tx
          .delete(relationships)
          .where(and(eq(relationships.fromId, child.id), eq(relationships.kind, field)));
        await tx
          .insert(relationships)
          .values({ fromId: child.id, toId: target.id, kind: field });
      });
      return;
    }
    // 0..n: a duplicate target is refused, the single insert is its own
    // atomic unit. The pre-check gives the friendly message; the unique
    // constraint `relationships_target_uq` is the authority — two
    // concurrent attachments can both pass the pre-check, only one
    // insert survives.
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
    try {
      await this.db
        .insert(relationships)
        .values({ fromId: child.id, toId: target.id, kind: field });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `${targetSlug} is already attached to '${field}'`,
        );
      }
      throw error;
    }
  }

  /**
   * Attaches a hierarchy parent: the link is deliberate, never replaced
   * (design decision 8's hierarchy exception, the records-hierarchy
   * capability's "Single parent enforced" scenario). The pre-check gives
   * the friendly message; the one-per-child partial unique index is the
   * authority — this path inserts without deleting, so two concurrent
   * parents mean the losing insert violates it instead of replacing the
   * winner through a delete+insert.
   */
  private async attachHierarchyParent(
    childId: string,
    field: HierarchyField,
    targetId: string,
  ): Promise<void> {
    const [current] = await this.db
      .select({ toId: relationships.toId })
      .from(relationships)
      .where(and(eq(relationships.fromId, childId), eq(relationships.kind, field)))
      .limit(1);
    if (current) {
      throw new ConflictException(
        "This record already has a parent there — detach it first",
      );
    }
    try {
      await this.db
        .insert(relationships)
        .values({ fromId: childId, toId: targetId, kind: field });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "This record already has a parent there — detach it first",
        );
      }
      throw error;
    }
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

  /** Children attached through a hierarchy field, in play order
   * (records-editor decision 10): explicit order ascending, records
   * without an order last, then title. */
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
      .orderBy(
        sql`(entities.fields->>'order')::int NULLS LAST`,
        entities.title,
      );
  }

  /**
   * Moves a child up or down within its sibling play order (records-
   * editor decision 10): the sibling list is recomputed and every
   * sibling's order renumbered sequentially. The hierarchy field is the
   * child type's own parent reference.
   */
  async moveChild(childSlug: string, direction: "up" | "down"): Promise<void> {
    const child = await this.entityBySlug(childSlug);
    const field = hierarchyFieldOf(child.type);
    if (field === null) {
      throw new ConflictException(
        `A ${child.type} record has no play-order position`,
      );
    }
    const [link] = await this.db
      .select({ toId: relationships.toId })
      .from(relationships)
      .where(and(eq(relationships.fromId, child.id), eq(relationships.kind, field)))
      .limit(1);
    if (!link) {
      throw new ConflictException(
        "This record has no parent — attach it first",
      );
    }
    const siblings = await this.childSlugsAndStatuses(link.toId, field);
    const index = siblings.findIndex((sibling) => sibling.slug === childSlug);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    // One transaction, and each sibling keeps its own fields: the update
    // writes only the order key into the current database JSON (a full
    // snapshot replacement would resurrect a stale prose draft saved by
    // a concurrent request between the read and the write).
    await this.db.transaction(async (tx) => {
      // The row updates touch distinct rows: one statement set inside
      // the transaction, run concurrently.
      await Promise.all(
        reordered.map((sibling, position) =>
          tx
            .update(entities)
            .set({
              fields: sql`jsonb_set(coalesce(${entities.fields}, '{}'::jsonb), '{order}', to_jsonb(${position}::int))`,
            })
            .where(eq(entities.slug, sibling.slug)),
        ),
      );
    });
  }

  /** Refuses deletion of a record that children reference as campaign
   * parent or as chapter — both hierarchy fields block the deletion. */
  async assertNoChildren(entityId: string): Promise<void> {
    const [row] = await this.db
      .select({ fromId: relationships.fromId })
      .from(relationships)
      .where(
        and(
          eq(relationships.toId, entityId),
          inArray(relationships.kind, ["campaign", "chapter"]),
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
      .orderBy(
        sql`(entities.fields->>'order')::int NULLS LAST`,
        entities.title,
      );
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

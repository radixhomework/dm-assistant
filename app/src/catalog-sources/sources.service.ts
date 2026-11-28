import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type { CreateSourceInput, UpdateSourceInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { isUniqueViolation } from "../database/unique-violation.js";
import { catalogSources } from "../database/schema.js";

export type CatalogSourceRow = typeof catalogSources.$inferSelect;

/** The client-facing shape: the disabled flag collapses the timestamp. */
export type SourceView = {
  id: string;
  name: string;
  attribution: string | null;
  internal: boolean;
  disabled: boolean;
};

@Injectable()
export class CatalogSourcesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  toView(row: CatalogSourceRow): SourceView {
    return {
      id: row.id,
      name: row.name,
      attribution: row.attribution,
      internal: row.internal,
      disabled: row.disabledAt !== null,
    };
  }

  /** Registry listing — feeds import selection, badges and the
   * attribution page. Internal first, then alphabetical. */
  async list(): Promise<SourceView[]> {
    const rows = await this.db
      .select()
      .from(catalogSources)
      .orderBy(sql`${catalogSources.internal} DESC`, catalogSources.name);
    return rows.map((row) => this.toView(row));
  }

  /**
   * The built-in Internal source, resolved by its flag (never by name —
   * the name is data, the flag is the invariant). Missing means the
   * instance skipped migration 0010: a hard deployment error.
   */
  async internal(): Promise<CatalogSourceRow> {
    const [row] = await this.db
      .select()
      .from(catalogSources)
      .where(eq(catalogSources.internal, true))
      .limit(1);
    if (!row) {
      throw new InternalServerErrorException("Internal source missing");
    }
    return row;
  }

  /**
   * The provenance of a record: id, name and the internal flag — the
   * sheet splits the Internal badge (i18n label) from external badges
   * (source name) on it, and the edit form reads the flag to offer
   * DM-field-only editing on imported records.
   */
  async viewOf(
    sourceId: string | null,
  ): Promise<{ id: string; name: string; internal: boolean } | null> {
    if (!sourceId) return null;
    const [row] = await this.db
      .select()
      .from(catalogSources)
      .where(eq(catalogSources.id, sourceId))
      .limit(1);
    return row ? { id: row.id, name: row.name, internal: row.internal } : null;
  }

  /** Administrator action: registers a named external source. Creation
   * is always external — the Internal source exists by seed only. */
  async create(input: CreateSourceInput): Promise<SourceView> {
    try {
      const [row] = await this.db
        .insert(catalogSources)
        .values({
          name: input.name,
          attribution: input.attribution ?? null,
          internal: false,
        })
        .returning();
      return this.toView(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: "source_name_taken",
          message: "source_name_taken",
        });
      }
      throw error;
    }
  }

  /**
   * Administrator action: rename, attribution note, disable toggle.
   * The built-in Internal source is immutable and non-disableable —
   * every update on it is refused with a stable code.
   */
  async update(id: string, input: UpdateSourceInput): Promise<SourceView> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(catalogSources)
        .where(eq(catalogSources.id, id))
        .for("update");
      if (!row) {
        throw new NotFoundException(`Source '${id}' not found`);
      }
      if (row.internal) {
        throw new ConflictException({
          code: "source_immutable",
          message: "source_immutable",
        });
      }
      const disabledAt =
        input.disabled === undefined
          ? row.disabledAt
          : input.disabled
            ? (row.disabledAt ?? new Date())
            : null;
      const [updated] = await tx
        .update(catalogSources)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.attribution !== undefined
            ? { attribution: input.attribution }
            : {}),
          ...(disabledAt !== row.disabledAt ? { disabledAt } : {}),
        })
        .where(eq(catalogSources.id, id))
        .returning();
      return this.toView(updated);
    });
  }
}

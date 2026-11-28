import { Inject, Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import type { RenameTagInput, MergeTagInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { normalizeTags } from "./entities.service.js";

export type TagActionResult = { renamed: number } | { merged: number };

/**
 * SQL-side normalization of a stored tag value — the same rules as
 * `normalizeTags` (trim, lowercase, whitespace collapse) applied to the
 * STORED values during matching: rows written before a normalization
 * rule existed (or by a future path bypassing the service) stay
 * reachable by the admin actions (CodeRabbit round-2 review).
 */
const NORM = (value: SQL) =>
  sql`lower(regexp_replace(btrim(${value}), '\\s+', ' ', 'g'))`;

/**
 * Instance-wide tag management (record-tags capability, admin only):
 * rename rewrites every record carrying the tag; merge absorbs it into
 * a target — records already carrying the target are deduplicated.
 * One transaction per action, reporting the touched record count.
 * Matching normalizes the stored values, so legacy rows respond too.
 */
@Injectable()
export class TagsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async rename(input: RenameTagInput): Promise<{ renamed: number }> {
    // Normalize each value separately: the shared helper deduplicates,
    // and from === to would collapse into a single entry.
    const [from] = normalizeTags([input.from]);
    const [to] = normalizeTags([input.to]);
    if (!from || !to || from === to) {
      return { renamed: 0 };
    }
    return this.db.transaction(async (tx) => {
      // Every occurrence of a stored value normalizing to `from`
      // becomes `to`; DISTINCT collapses the duplicates a record
      // carrying BOTH tags would end up with; coalesce keeps an
      // emptied array at '{}' (array_agg over an empty set yields
      // NULL, and the column is NOT NULL).
      const rows = (await tx.execute(sql`
        UPDATE entities e SET tags = coalesce((
          SELECT array_agg(DISTINCT x)
          FROM (
            SELECT CASE WHEN ${NORM(sql`x`)} = ${from} THEN ${to} ELSE x END AS x
            FROM unnest(e.tags) AS x
          ) AS mapped
        ), ARRAY[]::text[])
        WHERE EXISTS (
          SELECT 1 FROM unnest(e.tags) AS t WHERE ${NORM(sql`t`)} = ${from}
        )
        RETURNING e.id
      `)) as unknown[];
      return { renamed: rows.length };
    });
  }

  async merge(input: MergeTagInput): Promise<{ merged: number }> {
    const [from] = normalizeTags([input.from]);
    const [into] = normalizeTags([input.into]);
    if (!from || !into || from === into) {
      return { merged: 0 };
    }
    return this.db.transaction(async (tx) => {
      // Drop every stored value normalizing to `from`, append `into`
      // when no stored value normalizes to it, deduplicate; coalesce
      // guards the emptied-array NULL (see rename).
      const rows = (await tx.execute(sql`
        UPDATE entities e SET tags = coalesce((
          SELECT array_agg(DISTINCT y)
          FROM (
            SELECT x AS y FROM unnest(e.tags) AS x
              WHERE ${NORM(sql`x`)} <> ${from}
            UNION ALL
            SELECT ${into} AS y
            WHERE NOT EXISTS (
              SELECT 1 FROM unnest(e.tags) AS t WHERE ${NORM(sql`t`)} = ${into}
            )
          ) AS agg
        ), ARRAY[]::text[])
        WHERE EXISTS (
          SELECT 1 FROM unnest(e.tags) AS t WHERE ${NORM(sql`t`)} = ${from}
        )
        RETURNING e.id
      `)) as unknown[];
      return { merged: rows.length };
    });
  }
}

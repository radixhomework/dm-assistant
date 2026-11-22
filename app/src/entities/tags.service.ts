import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { RenameTagInput, MergeTagInput } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { normalizeTags } from "./entities.service.js";

export type TagActionResult = { renamed: number } | { merged: number };

/**
 * Instance-wide tag management (record-tags capability, admin only):
 * rename rewrites every record carrying the tag; merge absorbs it into
 * a target — records already carrying the target are deduplicated.
 * One transaction per action, reporting the touched record count.
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
      // array_replace rewrites every occurrence; DISTINCT collapses the
      // duplicates a record carrying BOTH tags would end up with;
      // coalesce keeps an emptied array at '{}' (array_agg over an empty
      // set yields NULL, and the column is NOT NULL).
      const rows = (await tx.execute(sql`
        UPDATE entities SET tags = coalesce((
          SELECT array_agg(DISTINCT x)
          FROM unnest(array_replace(tags, ${from}, ${to})) AS x
        ), ARRAY[]::text[])
        WHERE ${from} = ANY(tags)
        RETURNING id
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
      // Remove `from` from every carrying record and append `into` when
      // absent; DISTINCT collapses records already carrying the target;
      // coalesce guards the emptied-array NULL (see rename).
      const rows = (await tx.execute(sql`
        UPDATE entities SET tags = coalesce((
          SELECT array_agg(DISTINCT x)
          FROM unnest(
            array_remove(tags, ${from}) ||
            CASE WHEN ${into} = ANY(tags)
              THEN ARRAY[]::text[]
              ELSE ARRAY[${into}]
            END
          ) AS x
        ), ARRAY[]::text[])
        WHERE ${from} = ANY(tags)
        RETURNING id
      `)) as unknown[];
      return { merged: rows.length };
    });
  }
}

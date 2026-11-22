import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";

export type TagInventoryEntry = { tag: string; count: number };

/**
 * Tags inventory (record-tags capability, landed early with the search
 * round: the tag filters and completions read it — the admin Tags tab
 * and the MCP `list_tags()` reuse it later). Auth comes from the global
 * session guard: every authenticated DM account may read the inventory.
 */
@Controller("api/tags")
export class TagsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async inventory(): Promise<TagInventoryEntry[]> {
    // Count RECORDS per tag, not array occurrences: a record whose tags
    // array repeats a value must count once (CodeRabbit round-1 review).
    const rows = (await this.db.execute(sql`
      SELECT tag, count(*) AS count
      FROM (
        SELECT DISTINCT e.id, t.tag
        FROM entities e, unnest(e.tags) AS t(tag)
      ) AS record_tags
      GROUP BY tag
      ORDER BY tag ASC
    `)) as Array<{ tag: string; count: string | number }>;
    return rows.map((row) => ({ tag: row.tag, count: Number(row.count) }));
  }
}

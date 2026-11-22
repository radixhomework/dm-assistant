import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { proseFieldKeys } from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";

export type SearchHit = {
  id: string;
  slug: string;
  title: string;
  type: string;
  perimeter: "world" | "campaign";
  tags: string[];
  snippet: string;
};

/** Result cap: the search page paginates client-side later if ever
 * needed — v1 keeps one bounded page. */
const SEARCH_LIMIT = 50;

@Injectable()
export class SearchService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Full-text search over records (full-text-search capability): the
   * tsvector match (`search_vector @@ websearch_to_tsquery`, the ONE
   * fixed `simple_unaccent` configuration — accent-insensitive in both
   * languages, PRE-SPEC §2 decision of 2026-11-09) OR a partial title
   * ILIKE as a recall helper. The title-first contract is enforced
   * EXPLICITLY — records whose title matches (vector title match or
   * ILIKE) rank ahead of records matched only in their fields, then
   * ts_rank orders within each group (ts_rank alone does not guarantee
   * the title-first promise across multiword queries). Snippets come
   * from ts_headline over the same document the index is built from,
   * with explicit delimiters the frontend splits into React nodes.
   */
  async search(filters: {
    q: string;
    type?: string;
    tag?: string;
  }): Promise<SearchHit[]> {
    const query = filters.q.trim();
    if (query.length === 0) {
      // An empty tsquery matches nothing, but the ILIKE helper would
      // match everything — answer the empty result directly.
      return [];
    }

    const escaped = query.replaceAll(/[%_\\]/g, String.raw`\$&`);
    const like = `%${escaped}%`;
    // The headline document is the exact text the index is built from:
    // title + the prose/short-text field values (delimiters ⟦ ⟧ —
    // mathematical brackets, absent from lore prose).
    const keys = [...proseFieldKeys];
    const keyList = sql.join(
      keys.map((key) => sql`${key}`),
      sql`, `,
    );
    const document = sql`(e.title || E'\n' || coalesce((SELECT string_agg(value, E'\n') FROM jsonb_each_text(e.fields) WHERE key IN (${keyList})), ''))`;

    const conditions = [];
    const types = (filters.type ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (types.length === 1) {
      conditions.push(sql`e.type = ${types[0]}`);
    } else if (types.length > 1) {
      // Hoisted out of the outer template literal: no nested templates
      // (Sonar S4624).
      const typeList = sql.join(
        types.map((t) => sql`${t}`),
        sql`, `,
      );
      conditions.push(sql`e.type IN (${typeList})`);
    }
    if (filters.tag) {
      conditions.push(sql`${filters.tag} = ANY(e.tags)`);
    }
    const filterSql =
      conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`;

    const rows = (await this.db.execute(sql`
      SELECT e.id, e.slug, e.title, e.type, e.perimeter, e.tags,
        (e.search_vector @@ q.q) AS matched,
        (q.q @@ to_tsvector('simple_unaccent', e.title) OR e.title ILIKE ${like}) AS title_matched,
        ts_rank(e.search_vector, q.q) AS rank,
        ts_headline('simple_unaccent', ${document}, q.q,
          'StartSel=⟦,StopSel=⟧,MaxFragments=2,MaxWords=24,MinWords=8,ShortWord=0,FragmentDelimiter=…') AS snippet
      FROM entities e, websearch_to_tsquery('simple_unaccent', ${query}) AS q(q)
      WHERE ${filterSql} AND (e.search_vector @@ q.q OR e.title ILIKE ${like})
      ORDER BY title_matched DESC, matched DESC, rank DESC, e.title ASC
      LIMIT ${SEARCH_LIMIT}
    `)) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      type: row.type as string,
      perimeter: row.perimeter as "world" | "campaign",
      tags: row.tags as string[],
      snippet: row.snippet as string,
    }));
  }
}

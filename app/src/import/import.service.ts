import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import {
  convertSrdUnits,
  mapOpen5eObject,
  open5eObjectSchema,
  templateSchemaOf,
  type CatalogType,
  type Open5eMapped,
  type WorldUnits,
} from "@dm/schemas";
import type { Db } from "../database/database.module.js";
import { DB } from "../database/database.module.js";
import { isUniqueViolation } from "../database/unique-violation.js";
import { catalogSources, entities, mentions } from "../database/schema.js";
import { buildSearchVector, extractSearchableText } from "../search/search-index.js";
import { parseMentionSlugs } from "../entities/entities.service.js";
import { CatalogSourcesService } from "../catalog-sources/sources.service.js";
import type { SourceView } from "../catalog-sources/sources.service.js";
import { SettingsService } from "../settings/settings.service.js";

/** The transaction handle a drizzle transaction callback receives. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The provenance an import runs under: an existing, enabled, external
 * named source — the Internal source has no import path. */
export type ImportOrigin = {
  catalog: CatalogType;
  sourceId: string;
  /** The Open5e document the descriptions are read from
   * (srd-catalog-import decision 9, default srd-2024). */
  document?: string;
};

export type PreviewItem = {
  slug: string;
  title: string;
  status: "new" | "overwrite" | "conflict" | "skipped";
  /** Same-source overwrites arrive pre-checked; conflicts stay
   * unchecked until the DM explicitly selects them. */
  preChecked?: boolean;
  /** For overwrite/conflict: the record currently holding the slug. */
  existingTitle?: string;
  existingSourceName?: string;
  /** For skipped: why the element cannot be imported. */
  reason?: string;
};

export type ImportPreview = { items: PreviewItem[] };

export type ImportReport = {
  created: number;
  updated: number;
  skipped: Array<{ slug: string; title: string; reason: string }>;
};

export class ImportInputError extends BadRequestException {
  constructor(message: string) {
    super({ code: "import_invalid_payload", message });
  }
}

/**
 * The Open5e catalog import (srd-catalog-import capability): an explicit
 * human action — never scheduled, never triggered by the AI (charter
 * rule 6). The service layer runs dry-run by default: parse → validate →
 * map → match by slug → classify; the confirm re-validates everything
 * statelessly (no server-side preview session) and writes the accepted
 * set in ONE transaction. A failing element never blocks the run — it is
 * skipped and reported; the accepted set stays all-or-nothing.
 */
@Injectable()
export class ImportService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly sources: CatalogSourcesService,
    private readonly settings: SettingsService,
  ) {}

  /** Dry-run: nothing is written; every element lands in the preview. */
  async preview(origin: ImportOrigin, elements: unknown[]): Promise<ImportPreview> {
    const source = await this.importSource(origin.sourceId);
    const items: PreviewItem[] = [];
    const seenSlugs = new Set<string>();
    for (const element of elements) {
      items.push((await this.classify(origin, source, element, seenSlugs)).item);
    }
    return { items };
  }

  /**
   * Confirm: the stateless second call — the payload is re-validated and
   * re-classified, the accepted selection is applied, and the write runs
   * in one transaction. New elements always import; overwrites and
   * conflicts only when their slug is in the accepted set (a confirmed
   * cross-source overwrite rebinds the record to the importing source).
   */
  async confirm(
    origin: ImportOrigin,
    elements: unknown[],
    accepted: string[],
  ): Promise<ImportReport> {
    const source = await this.importSource(origin.sourceId);
    const units = await this.units();
    const acceptedSlugs = new Set(accepted);
    const skipped: ImportReport["skipped"] = [];
    const creates: Open5eMapped[] = [];
    const updates: Array<{ mapped: Open5eMapped; rebind: boolean }> = [];
    const seenSlugs = new Set<string>();
    for (const element of elements) {
      const { item, mapped } = await this.classify(origin, source, element, seenSlugs);
      if (item.status === "skipped") {
        skipped.push({ slug: item.slug, title: item.title, reason: item.reason! });
        continue;
      }
      if (item.status === "new") {
        creates.push(mapped!);
        continue;
      }
      if (acceptedSlugs.has(item.slug)) {
        updates.push({ mapped: mapped!, rebind: item.status === "conflict" });
      } else {
        skipped.push({ slug: item.slug, title: item.title, reason: "not_accepted" });
      }
    }

    return this.db.transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const mapped of creates) {
        await this.insertImported(tx, origin, mapped, units);
        created += 1;
      }
      for (const update of updates) {
        // The stateless confirm re-validates everything: the row holding
        // the slug is re-read under lock — deleted or re-typed between
        // preview and confirm means skipped, never half-written.
        const [row] = await tx
          .select({ id: entities.id, type: entities.type })
          .from(entities)
          .where(eq(entities.slug, update.mapped.slug))
          .for("update");
        if (!row || row.type !== origin.catalog) {
          skipped.push({
            slug: update.mapped.slug,
            title: update.mapped.title,
            reason: "slug_taken",
          });
          continue;
        }
        await this.updateImported(tx, origin, row.id, update.mapped, update.rebind, units);
        updated += 1;
      }
      return { created, updated, skipped };
    });
  }

  /** The import source: existing, external, enabled — the Internal
   * source and a disabled source have no import path. */
  private async importSource(sourceId: string): Promise<SourceView> {
    const listed = await this.sources.list();
    const source = listed.find((candidate) => candidate.id === sourceId);
    if (!source || source.internal || source.disabled) {
      throw new ImportInputError("the import runs under an enabled external source");
    }
    return source;
  }

  private async units(): Promise<WorldUnits> {
    const all = await this.settings.getAll();
    return {
      distanceUnit: all.distanceUnit,
      weightUnit: all.weightUnit,
      volumeUnit: all.volumeUnit,
    };
  }

  /**
   * One element through parse → validate → map → match by slug.
   * Classification never throws on an element — invalid ones are
   * skipped with their reason; duplicate slugs inside one dataset flag
   * the later occurrences (only the first can import).
   */
  private async classify(
    origin: ImportOrigin,
    source: SourceView,
    element: unknown,
    seenSlugs: Set<string>,
  ): Promise<{ item: PreviewItem; mapped: Open5eMapped | null }> {
    const parsed = open5eObjectSchema.safeParse(element);
    if (!parsed.success) {
      const raw = (typeof element === "object" && element !== null ? element : {}) as {
        name?: unknown;
        key?: unknown;
        slug?: unknown;
      };
      return {
        item: {
          slug: typeof raw.key === "string" ? raw.key : typeof raw.slug === "string" ? raw.slug : "",
          title: typeof raw.name === "string" ? raw.name : "",
          status: "skipped",
          reason: "invalid_element",
        },
        mapped: null,
      };
    }
    const mapped = mapOpen5eObject(
      parsed.data,
      origin.document ?? "srd-2024",
    );
    // The dataset format requires the text: an element carrying no
    // description for the chosen document (another source's rows in an
    // unfiltered Open5e list) is skipped with its reason — importing it
    // would fill the template's only meaningful field with nothing and
    // mislabel third-party content under the importing source.
    if (mapped.publicDescription === null) {
      return {
        item: {
          slug: mapped.slug,
          title: mapped.title,
          status: "skipped",
          reason: "no_text_for_document",
        },
        mapped: null,
      };
    }
    const template = templateSchemaOf(origin.catalog);
    if (template && !template.fields.safeParse(mappedFields(mapped)).success) {
      return {
        item: {
          slug: mapped.slug,
          title: mapped.title,
          status: "skipped",
          reason: "invalid_element",
        },
        mapped: null,
      };
    }
    if (seenSlugs.has(mapped.slug)) {
      return {
        item: {
          slug: mapped.slug,
          title: mapped.title,
          status: "skipped",
          reason: "duplicate_in_dataset",
        },
        mapped: null,
      };
    }
    seenSlugs.add(mapped.slug);

    // The slug match: same catalog type + same source → overwrite
    // (pre-checked); different provenance → conflict (unchecked); the
    // slug is unique per instance, so a record of another type holding
    // it is a skip with its reason (decision 7).
    const [existing] = await this.db
      .select({
        id: entities.id,
        type: entities.type,
        title: entities.title,
        sourceId: entities.sourceId,
      })
      .from(entities)
      .where(eq(entities.slug, mapped.slug))
      .limit(1);
    if (!existing) {
      return { item: { slug: mapped.slug, title: mapped.title, status: "new" }, mapped };
    }
    if (existing.type !== origin.catalog) {
      return {
        item: {
          slug: mapped.slug,
          title: mapped.title,
          status: "skipped",
          reason: "slug_taken",
          existingTitle: existing.title,
        },
        mapped: null,
      };
    }
    if (existing.sourceId === source.id) {
      return {
        item: {
          slug: mapped.slug,
          title: mapped.title,
          status: "overwrite",
          preChecked: true,
          existingTitle: existing.title,
          existingSourceName: source.name,
        },
        mapped,
      };
    }
    const [existingSource] = existing.sourceId
      ? await this.db
          .select({ name: catalogSources.name })
          .from(catalogSources)
          .where(eq(catalogSources.id, existing.sourceId))
          .limit(1)
      : [];
    return {
      item: {
        slug: mapped.slug,
        title: mapped.title,
        status: "conflict",
        preChecked: false,
        existingTitle: existing.title,
        existingSourceName: existingSource?.name ?? "Internal",
      },
      mapped,
    };
  }

  private async insertImported(
    tx: Tx,
    origin: ImportOrigin,
    mapped: Open5eMapped,
    units: WorldUnits,
  ): Promise<void> {
    const fields = convertSrdUnits(mappedFields(mapped), units);
    try {
      const [row] = await tx
        .insert(entities)
        .values({
          slug: mapped.slug,
          type: origin.catalog,
          perimeter: "world",
          title: mapped.title,
          tags: [],
          fields,
          sourceId: origin.sourceId,
          searchVector: buildSearchVector(
            mapped.title,
            extractSearchableText(fields),
          ),
        })
        .returning();
      await this.replaceMentions(tx, row.id, fields);
    } catch (error) {
      if (isUniqueViolation(error)) {
        // A record created between preview and confirm holds the slug.
        throw new ImportInputError(`slug '${mapped.slug}' was taken during the import`);
      }
      throw error;
    }
  }

  private async updateImported(
    tx: Tx,
    origin: ImportOrigin,
    existingId: string,
    mapped: Open5eMapped,
    rebind: boolean,
    units: WorldUnits,
  ): Promise<void> {
    const [existing] = await tx
      .select({ fields: entities.fields })
      .from(entities)
      .where(eq(entities.id, existingId))
      .for("update");
    const previous = (existing.fields ?? {}) as Record<string, unknown>;
    // Source-derived fields hold the dataset's values; the DM-authored
    // fields are preserved (cross-source rebind scenario). A dataset
    // carrying no text for the chosen document leaves the description.
    const fields = convertSrdUnits(
      mapped.publicDescription === null
        ? previous
        : { ...previous, public_description: mapped.publicDescription },
      units,
    );
    await tx
      .update(entities)
      .set({
        title: mapped.title,
        fields,
        ...(rebind ? { sourceId: origin.sourceId } : {}),
        searchVector: buildSearchVector(
          mapped.title,
          extractSearchableText(fields),
        ),
        updatedAt: new Date(),
      })
      .where(eq(entities.id, existingId));
    await this.replaceMentions(tx, existingId, fields);
  }

  private async replaceMentions(
    tx: Tx,
    entityId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const proseText = Object.entries(fields)
      .filter(([, value]) => typeof value === "string")
      .map(([, value]) => value as string)
      .join("\n");
    const slugs = parseMentionSlugs(proseText);
    await tx.delete(mentions).where(eq(mentions.entityId, entityId));
    if (slugs.length > 0) {
      await tx
        .insert(mentions)
        .values(slugs.map((slug) => ({ entityId, targetSlug: slug })));
    }
  }
}

/** The catalog fields an element maps to: prose only — mechanical
 * extras are never imported in v1 (decision 9). */
function mappedFields(mapped: Open5eMapped): Record<string, unknown> {
  return mapped.publicDescription === null
    ? {}
    : { public_description: mapped.publicDescription };
}

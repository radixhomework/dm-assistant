import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import {
  catalogTypes,
  purgeConfirmSchema,
  purgeQuerySchema,
  type CatalogType,
} from "@dm/schemas";
import { AdminGuard } from "../auth/admin.guard.js";
import { extractElements, fetchDataset } from "./fetch-dataset.js";
import { ImportInputError } from "./import-errors.js";
import { ImportService } from "./import.service.js";

/** The import selection fields (admin-only action, charter rule 6). */
const originSchema = z.object({
  catalog: z.enum(catalogTypes),
  sourceId: z.uuid(),
  document: z.string().min(1).max(80).optional(),
});

const urlSchema = z.url().max(2048);

/** The structural shape of a multer upload (multer ships with
 * platform-express; only its memory buffer is read). */
type UploadedDataset = { buffer: Buffer; size: number };

const MAX_DATASET_BYTES = 10 * 1024 * 1024; // 10 MB

@Controller("api/admin/catalogs/import")
@UseGuards(AdminGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /** Dry-run: file upload or endpoint URL — nothing is written. */
  @Post("preview")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_DATASET_BYTES } }),
  )
  async preview(
    @UploadedFile() file?: UploadedDataset,
    @Body() body?: unknown,
  ): Promise<unknown> {
    const { origin, elements } = await this.resolveOrigin(file, body);
    return this.importService.preview(origin, elements);
  }

  /** Confirm: the stateless second call — everything re-validates. */
  @Post("confirm")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_DATASET_BYTES } }),
  )
  async confirm(
    @UploadedFile() file?: UploadedDataset,
    @Body() body?: unknown,
  ): Promise<unknown> {
    const { origin, elements } = await this.resolveOrigin(file, body);
    const accepted = this.parseAccepted((body ?? {}) as Record<string, unknown>);
    return this.importService.confirm(origin, elements, accepted);
  }

  /**
   * Two origins: an uploaded JSON file (multipart) or an API endpoint
   * URL (JSON body) fetched server-side with pagination followed under
   * the page cap. A multipart body carries the selection fields as
   * strings; a JSON body carries them typed.
   */
  private async resolveOrigin(
    file: UploadedDataset | undefined,
    body: unknown,
  ): Promise<{
    origin: { catalog: CatalogType; sourceId: string; document?: string };
    elements: unknown[];
  }> {
    const raw = (body ?? {}) as Record<string, unknown>;
    const { catalog, sourceId, document } = originSchema.parse({
      catalog: raw.catalog,
      sourceId: raw.sourceId,
      document: raw.document,
    });
    const origin = {
      catalog,
      sourceId,
      ...(document !== undefined ? { document } : {}),
    };
    if (file) {
      // File mode: the uploaded dataset is parsed (multer caps the
      // size; a 413 answers an oversized upload).
      let payload: unknown;
      try {
        payload = JSON.parse(file.buffer.toString("utf8"));
      } catch {
        throw new ImportInputError("the uploaded file is not valid JSON");
      }
      return { origin, elements: extractElements(payload) };
    }
    // URL mode: fetched server-side, pagination under the cap, SSRF
    // guard on the first URL and on every followed `next` link.
    const url = urlSchema.parse(raw.url);
    return { origin, elements: await fetchDataset(url) };
  }

  /** The source-scoped purge preview: the records one catalog carries
   * under one external source. */
  @Get("purge")
  async purgePreview(
    @Query("catalog") catalog?: string,
    @Query("sourceId") sourceId?: string,
  ): Promise<unknown> {
    const input = purgeQuerySchema.parse({ catalog, sourceId });
    return this.importService.purgePreview(input.catalog, input.sourceId);
  }

  /** The purge confirm: the accepted slugs delete in one transaction. */
  @Post("purge")
  async purgeConfirm(@Body() body: unknown): Promise<unknown> {
    const input = purgeConfirmSchema.parse(body);
    return this.importService.purgeConfirm(input.catalog, input.sourceId, input.slugs);
  }

  /** The accepted selection: an array in JSON mode, a JSON-encoded
   * string in multipart mode. */
  private parseAccepted(raw: Record<string, unknown>): string[] {
    const value = raw["accepted"];
    if (value === undefined) return [];
    if (Array.isArray(value)) {
      return z.array(z.string()).parse(value);
    }
    if (typeof value === "string") {
      try {
        return z.array(z.string()).parse(JSON.parse(value));
      } catch {
        throw new ImportInputError(
          "the accepted selection is not a JSON array",
        );
      }
    }
    throw new ImportInputError("the accepted selection is malformed");
  }
}

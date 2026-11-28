import {
  Body,
  BadRequestException,
  HttpCode,
  Req,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  attachReferenceSchema,
  createEntitySchema,
  moveSchema,
  parentSchema,
  updateEntitySchema,
} from "@dm/schemas";
import { RelationshipsService } from "../relationships/relationships.service.js";
import { CatalogSourcesService } from "../catalog-sources/sources.service.js";
import type { AuthedRequest } from "../auth/auth.guard.js";
import { EntitiesService } from "./entities.service.js";

/**
 * Provenance is never client-declared (srd-catalog-import decision 4):
 * the source rides neither creation nor update — the UI path binds the
 * Internal source in the service, the import binds external sources.
 */
function refuseProvenance(body: unknown): void {
  if (typeof body === "object" && body !== null && "sourceId" in body) {
    throw new BadRequestException({
      code: "source_not_allowed",
      message: "source_not_allowed",
    });
  }
}

@Controller("api/records")
export class EntitiesController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly relationshipsService: RelationshipsService,
    private readonly sourcesService: CatalogSourcesService,
  ) {}

  @Get()
  list(
    @Query("perimeter") perimeter?: "world" | "campaign",
    @Query("type") type?: string,
    @Query("q") q?: string,
  ) {
    if (q) {
      // Mention autocomplete mode: trigram search by title/slug.
      return this.entitiesService.autocomplete(q, type);
    }
    return this.entitiesService.list({ perimeter, type });
  }

  @Get(":slug/tracking")
  tracking(@Param("slug") slug: string) {
    return this.entitiesService.tracking(slug);
  }

  @Get(":slug")
  async getBySlug(@Param("slug") slug: string) {
    const record = await this.entitiesService.getBySlug(slug);
    const tracking = await this.entitiesService.tracking(slug);
    const references = await this.entitiesService.referencesOf(slug);
    const campaign = await this.entitiesService.campaignOf(record);
    const source = await this.sourcesService.viewOf(record.sourceId);
    return { ...record, tracking, references, campaign, source };
  }

  /** Reverse references grouped by field + incoming mentions. */
  @Get(":slug/backlinks")
  async backlinks(@Param("slug") slug: string) {
    return this.entitiesService.backlinksOf(slug);
  }

  /** Attaches a typed reference: field declared by the child's template. */
  @HttpCode(204)
  @Post(":slug/refs/:field")
  attachReference(
    @Param("slug") slug: string,
    @Param("field") field: string,
    @Body() body: unknown,
  ) {
    const { targetSlug } = attachReferenceSchema.parse(body);
    return this.relationshipsService.attachReference(slug, field, targetSlug);
  }

  /** Detaches one target of a field (or all of them without a target). */
  @HttpCode(204)
  @Delete(":slug/refs/:field/:targetSlug")
  detachReference(
    @Param("slug") slug: string,
    @Param("field") field: string,
    @Param("targetSlug") targetSlug: string,
  ) {
    return this.relationshipsService.detachReference(slug, field, targetSlug);
  }

  /** Moves a child up or down in its sibling play order. */
  @HttpCode(204)
  @Post(":slug/move")
  move(@Param("slug") slug: string, @Body() body: unknown) {
    const { direction } = moveSchema.parse(body);
    return this.relationshipsService.moveChild(slug, direction);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: unknown) {
    refuseProvenance(body);
    const input = createEntitySchema.parse(body);
    return this.entitiesService.create(input, req.user!.id);
  }

  @Patch(":slug")
  update(@Param("slug") slug: string, @Body() body: unknown) {
    refuseProvenance(body);
    const input = updateEntitySchema.parse(body);
    return this.entitiesService.update(slug, input);
  }

  @HttpCode(204)
  @Delete(":slug")
  delete(@Param("slug") slug: string) {
    return this.entitiesService.delete(slug);
  }

  @HttpCode(204)
  @Post(":slug/parent")
  attachParent(@Param("slug") slug: string, @Body() body: unknown) {
    const { parentSlug, kind } = parentSchema.parse(body);
    return this.relationshipsService.attachReference(slug, kind, parentSlug);
  }

}

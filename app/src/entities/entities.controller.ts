import {
  Body,
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
import type { AuthedRequest } from "../auth/auth.guard.js";
import { EntitiesService } from "./entities.service.js";

@Controller("api/records")
export class EntitiesController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly relationshipsService: RelationshipsService,
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
    return { ...record, tracking, references, campaign };
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
    const input = createEntitySchema.parse(body);
    return this.entitiesService.create(input, req.user!.id);
  }

  @Patch(":slug")
  update(@Param("slug") slug: string, @Body() body: unknown) {
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

  @HttpCode(204)
  @Delete(":slug/parent/:kind")
  detachParent(
    @Param("slug") slug: string,
    @Param("kind") kind: "campaign" | "chapter",
  ) {
    return this.relationshipsService.detachReference(slug, kind);
  }
}

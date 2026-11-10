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
  createEntitySchema,
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
  ) {
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
    return { ...record, tracking };
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
    return this.relationshipsService.attach(slug, parentSlug, kind);
  }

  @HttpCode(204)
  @Delete(":slug/parent/:kind")
  detachParent(
    @Param("slug") slug: string,
    @Param("kind") kind: "chapter" | "scene",
  ) {
    return this.relationshipsService.detach(slug, kind);
  }
}
